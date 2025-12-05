// server/src/utils/creditScore.js

/**
 * Credit Score Calculator
 *
 * Simple heuristic-based credit/risk score calculation
 * Score ranges from 0-100:
 * - 75-100: Excellent (Low Risk)
 * - 50-74:  Good (Medium Risk)
 * - 25-49:  Fair (High Risk)
 * - 0-24:   Poor (Critical Risk)
 *
 * Factors considered:
 * 1. Payment history (40%) - On-time vs late payments
 * 2. Outstanding dues (25%) - Overdue amount relative to principal
 * 3. Credit utilization (15%) - Loan amount vs income
 * 4. Account age (10%) - Length of relationship
 * 5. Number of active loans (10%) - Multiple loan management
 */

/**
 * Calculate credit score for a loan account
 * @param {Object} loanAccount - Loan account document with populated EMIs
 * @param {Array} emis - EMI documents for the loan
 * @param {Object} customer - Customer document (optional, for income-based factors)
 * @returns {Object} - Score details with breakdown
 */
const calculateLoanRiskScore = (loanAccount, emis, customer = null) => {
  const breakdown = {
    paymentHistory: { score: 0, weight: 40, details: {} },
    outstandingDues: { score: 0, weight: 25, details: {} },
    creditUtilization: { score: 0, weight: 15, details: {} },
    accountAge: { score: 0, weight: 10, details: {} },
    paymentConsistency: { score: 0, weight: 10, details: {} },
  };

  // 1. Payment History Score (40%)
  const paymentHistoryScore = calculatePaymentHistoryScore(emis);
  breakdown.paymentHistory = {
    ...breakdown.paymentHistory,
    score: paymentHistoryScore.score,
    details: paymentHistoryScore.details,
  };

  // 2. Outstanding Dues Score (25%)
  const outstandingScore = calculateOutstandingDuesScore(loanAccount, emis);
  breakdown.outstandingDues = {
    ...breakdown.outstandingDues,
    score: outstandingScore.score,
    details: outstandingScore.details,
  };

  // 3. Credit Utilization Score (15%)
  const utilizationScore = calculateUtilizationScore(loanAccount, customer);
  breakdown.creditUtilization = {
    ...breakdown.creditUtilization,
    score: utilizationScore.score,
    details: utilizationScore.details,
  };

  // 4. Account Age Score (10%)
  const ageScore = calculateAccountAgeScore(loanAccount);
  breakdown.accountAge = {
    ...breakdown.accountAge,
    score: ageScore.score,
    details: ageScore.details,
  };

  // 5. Payment Consistency Score (10%)
  const consistencyScore = calculateConsistencyScore(emis);
  breakdown.paymentConsistency = {
    ...breakdown.paymentConsistency,
    score: consistencyScore.score,
    details: consistencyScore.details,
  };

  // Calculate weighted total
  const totalScore = Object.values(breakdown).reduce((sum, factor) => {
    return sum + (factor.score * factor.weight) / 100;
  }, 0);

  const finalScore = Math.round(totalScore);

  return {
    score: finalScore,
    category: getScoreCategory(finalScore),
    breakdown,
    recommendations: getRecommendations(breakdown, finalScore),
    calculatedAt: new Date(),
  };
};

/**
 * Calculate payment history score
 * Based on on-time vs late payments
 */
const calculatePaymentHistoryScore = (emis) => {
  const paidEmis = emis.filter((emi) => emi.status === 'paid');
  const totalPaidEmis = paidEmis.length;

  if (totalPaidEmis === 0) {
    return {
      score: 50, // Neutral score for new loans
      details: {
        totalPaid: 0,
        onTime: 0,
        late: 0,
        onTimePercentage: 0,
      },
    };
  }

  // Count on-time and late payments
  const onTimePayments = paidEmis.filter((emi) => emi.daysLate === 0).length;
  const latePayments = totalPaidEmis - onTimePayments;
  const onTimePercentage = (onTimePayments / totalPaidEmis) * 100;

  // Score calculation
  // 100% on-time = 100 points
  // Each late payment reduces score
  let score = onTimePercentage;

  // Additional penalty for severely late payments (30+ days)
  const severelyLateCount = paidEmis.filter((emi) => emi.daysLate >= 30).length;
  score -= severelyLateCount * 5;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    details: {
      totalPaid: totalPaidEmis,
      onTime: onTimePayments,
      late: latePayments,
      severelyLate: severelyLateCount,
      onTimePercentage: Math.round(onTimePercentage * 100) / 100,
    },
  };
};

/**
 * Calculate outstanding dues score
 * Based on overdue amount relative to principal
 */
const calculateOutstandingDuesScore = (loanAccount, emis) => {
  const overdueEmis = emis.filter((emi) => emi.status === 'overdue');
  const overdueCount = overdueEmis.length;
  const totalOverdueAmount = overdueEmis.reduce(
    (sum, emi) => sum + emi.amount + (emi.penaltyAmount || 0),
    0
  );

  const overduePercentage = (totalOverdueAmount / loanAccount.principal) * 100;

  // Score calculation
  // No overdue = 100
  // Overdue percentage inversely affects score
  let score = 100;

  if (overdueCount > 0) {
    // Deduct points based on overdue percentage
    score -= overduePercentage * 2;

    // Additional penalty for multiple overdue EMIs
    score -= overdueCount * 5;

    // Severe penalty if overdue > 25% of principal
    if (overduePercentage > 25) {
      score -= 20;
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    details: {
      overdueCount,
      totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
      overduePercentage: Math.round(overduePercentage * 100) / 100,
      principal: loanAccount.principal,
    },
  };
};

/**
 * Calculate credit utilization score
 * Based on loan amount vs income (if available)
 */
const calculateUtilizationScore = (loanAccount, customer) => {
  if (!customer || !customer.monthlyIncome) {
    return {
      score: 70, // Default neutral-positive score if income unknown
      details: {
        incomeAvailable: false,
        message: 'Income data not available for utilization calculation',
      },
    };
  }

  const annualIncome = customer.monthlyIncome * 12;
  const utilizationRatio = (loanAccount.principal / annualIncome) * 100;

  // Ideal utilization: < 30% of annual income
  // Acceptable: 30-50%
  // High: > 50%
  let score = 100;

  if (utilizationRatio <= 30) {
    score = 100;
  } else if (utilizationRatio <= 50) {
    score = 100 - (utilizationRatio - 30);
  } else if (utilizationRatio <= 80) {
    score = 70 - (utilizationRatio - 50) * 0.5;
  } else {
    score = 55 - (utilizationRatio - 80) * 0.5;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    details: {
      incomeAvailable: true,
      monthlyIncome: customer.monthlyIncome,
      annualIncome,
      loanAmount: loanAccount.principal,
      utilizationRatio: Math.round(utilizationRatio * 100) / 100,
    },
  };
};

/**
 * Calculate account age score
 * Longer relationship = better score
 */
const calculateAccountAgeScore = (loanAccount) => {
  const startDate = new Date(loanAccount.startDate);
  const now = new Date();
  const monthsActive = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30));

  // Score increases with account age
  // New account (0-3 months): 40-60
  // 3-6 months: 60-70
  // 6-12 months: 70-85
  // 12+ months: 85-100

  let score;
  if (monthsActive <= 3) {
    score = 40 + (monthsActive * 6.67);
  } else if (monthsActive <= 6) {
    score = 60 + ((monthsActive - 3) * 3.33);
  } else if (monthsActive <= 12) {
    score = 70 + ((monthsActive - 6) * 2.5);
  } else {
    score = 85 + Math.min(15, (monthsActive - 12) * 0.5);
  }

  return {
    score: Math.round(score),
    details: {
      startDate,
      monthsActive,
      message: monthsActive < 6 ? 'Account is relatively new' : 'Established account',
    },
  };
};

/**
 * Calculate payment consistency score
 * Based on variance in payment timing
 */
const calculateConsistencyScore = (emis) => {
  const paidEmis = emis.filter((emi) => emi.status === 'paid' && emi.paidDate);

  if (paidEmis.length < 2) {
    return {
      score: 70, // Neutral score for insufficient data
      details: {
        message: 'Insufficient payment history for consistency analysis',
        paymentsAnalyzed: paidEmis.length,
      },
    };
  }

  // Calculate variance in days from due date
  const daysVariance = paidEmis.map((emi) => {
    const dueDate = new Date(emi.dueDate);
    const paidDate = new Date(emi.paidDate);
    return Math.floor((paidDate - dueDate) / (1000 * 60 * 60 * 24));
  });

  const avgVariance =
    daysVariance.reduce((sum, days) => sum + Math.abs(days), 0) / daysVariance.length;

  // Lower variance = higher consistency = better score
  let score = 100;
  if (avgVariance <= 0) {
    score = 100; // Pays on or before due date
  } else if (avgVariance <= 3) {
    score = 90;
  } else if (avgVariance <= 7) {
    score = 75;
  } else if (avgVariance <= 15) {
    score = 60;
  } else {
    score = Math.max(30, 60 - (avgVariance - 15));
  }

  return {
    score: Math.round(score),
    details: {
      paymentsAnalyzed: paidEmis.length,
      averageDaysFromDue: Math.round(avgVariance * 100) / 100,
      consistency: avgVariance <= 3 ? 'Excellent' : avgVariance <= 7 ? 'Good' : 'Needs Improvement',
    },
  };
};

/**
 * Get score category
 */
const getScoreCategory = (score) => {
  if (score >= 75) return { label: 'Excellent', risk: 'Low', color: 'green' };
  if (score >= 50) return { label: 'Good', risk: 'Medium', color: 'yellow' };
  if (score >= 25) return { label: 'Fair', risk: 'High', color: 'orange' };
  return { label: 'Poor', risk: 'Critical', color: 'red' };
};

/**
 * Get recommendations based on score breakdown
 */
const getRecommendations = (breakdown, totalScore) => {
  const recommendations = [];

  if (breakdown.paymentHistory.score < 70) {
    recommendations.push('Focus on making payments on or before due dates');
  }

  if (breakdown.outstandingDues.score < 60) {
    recommendations.push('Clear overdue EMIs to improve credit standing');
  }

  if (breakdown.creditUtilization.score < 60) {
    recommendations.push('Consider reducing loan burden relative to income');
  }

  if (breakdown.paymentConsistency.score < 70) {
    recommendations.push('Maintain consistent payment timing each month');
  }

  if (totalScore >= 75 && recommendations.length === 0) {
    recommendations.push('Excellent credit behavior! Keep it up.');
  }

  return recommendations;
};

/**
 * Calculate aggregate credit score for a customer across all loans
 * @param {Array} loanAccounts - Array of loan accounts with EMIs
 * @param {Object} customer - Customer document
 * @returns {Object} - Aggregate credit score
 */
const calculateCustomerCreditScore = (loanAccounts, customer) => {
  if (!loanAccounts || loanAccounts.length === 0) {
    return {
      score: 50, // Default score for new customers
      category: getScoreCategory(50),
      message: 'No loan history available',
      loansAnalyzed: 0,
    };
  }

  // Calculate score for each loan and weight by principal
  let weightedScoreSum = 0;
  let totalWeight = 0;
  const loanScores = [];

  for (const loan of loanAccounts) {
    if (loan.status === 'rejected' || loan.status === 'cancelled') continue;

    const emis = loan.emis || [];
    const scoreResult = calculateLoanRiskScore(loan, emis, customer);

    loanScores.push({
      accountNumber: loan.accountNumber,
      score: scoreResult.score,
      category: scoreResult.category,
    });

    // Weight by principal amount
    weightedScoreSum += scoreResult.score * loan.principal;
    totalWeight += loan.principal;
  }

  const aggregateScore =
    totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 50;

  return {
    score: aggregateScore,
    category: getScoreCategory(aggregateScore),
    loansAnalyzed: loanScores.length,
    loanScores,
    calculatedAt: new Date(),
  };
};

module.exports = {
  calculateLoanRiskScore,
  calculateCustomerCreditScore,
  getScoreCategory,
};
