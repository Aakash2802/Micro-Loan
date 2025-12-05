// server/src/utils/emiCalculator.js

/**
 * EMI Calculator Utility
 *
 * Standard EMI Formula (Reducing Balance Method):
 * EMI = [P × R × (1+R)^N] / [(1+R)^N – 1]
 *
 * Where:
 * P = Principal loan amount
 * R = Monthly interest rate (Annual rate / 12 / 100)
 * N = Total number of monthly installments (tenure in months)
 *
 * Flat Rate Method:
 * EMI = (P + (P × R × N)) / N
 */

/**
 * Calculate monthly EMI amount
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {string} interestType - 'reducing' or 'flat'
 * @returns {number} - Monthly EMI amount (rounded to 2 decimal places)
 */
const calculateEMI = (principal, annualRate, tenureMonths, interestType = 'reducing') => {
  if (principal <= 0 || tenureMonths <= 0) {
    throw new Error('Principal and tenure must be positive numbers');
  }

  if (annualRate < 0) {
    throw new Error('Interest rate cannot be negative');
  }

  // Handle 0% interest rate
  if (annualRate === 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  if (interestType === 'flat') {
    // Flat rate calculation
    const totalInterest = (principal * annualRate * tenureMonths) / (12 * 100);
    const totalPayable = principal + totalInterest;
    return Math.round((totalPayable / tenureMonths) * 100) / 100;
  }

  // Reducing balance (standard) EMI calculation
  const monthlyRate = annualRate / 12 / 100;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
  const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
  const emi = numerator / denominator;

  return Math.round(emi * 100) / 100;
};

/**
 * Generate complete amortization schedule
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {Date} startDate - Loan start date
 * @param {string} interestType - 'reducing' or 'flat'
 * @returns {Object} - Schedule with EMI details and summary
 */
const generateAmortizationSchedule = (
  principal,
  annualRate,
  tenureMonths,
  startDate,
  interestType = 'reducing'
) => {
  const schedule = [];
  const emiAmount = calculateEMI(principal, annualRate, tenureMonths, interestType);
  const monthlyRate = annualRate / 12 / 100;

  let openingBalance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;

  const loanStartDate = new Date(startDate);

  for (let i = 1; i <= tenureMonths; i++) {
    // Calculate due date (same day each month)
    const dueDate = new Date(loanStartDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interestComponent, principalComponent, closingBalance;

    if (interestType === 'flat') {
      // Flat rate: equal principal and interest distribution
      interestComponent = Math.round(((principal * annualRate) / (12 * 100)) * 100) / 100;
      principalComponent = Math.round((principal / tenureMonths) * 100) / 100;
    } else {
      // Reducing balance: interest on remaining principal
      interestComponent = Math.round(openingBalance * monthlyRate * 100) / 100;
      principalComponent = Math.round((emiAmount - interestComponent) * 100) / 100;
    }

    // Handle last EMI rounding
    if (i === tenureMonths) {
      principalComponent = Math.round(openingBalance * 100) / 100;
      const adjustedEmi = principalComponent + interestComponent;
      closingBalance = 0;

      schedule.push({
        sequence: i,
        dueDate,
        amount: Math.round(adjustedEmi * 100) / 100,
        principalComponent,
        interestComponent,
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance: 0,
      });
    } else {
      closingBalance = Math.round((openingBalance - principalComponent) * 100) / 100;

      schedule.push({
        sequence: i,
        dueDate,
        amount: emiAmount,
        principalComponent,
        interestComponent,
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance,
      });
    }

    totalInterest += interestComponent;
    totalPrincipal += principalComponent;
    openingBalance = closingBalance;
  }

  // Summary
  const totalPayable = Math.round((principal + totalInterest) * 100) / 100;

  return {
    summary: {
      principal,
      annualRate,
      tenureMonths,
      interestType,
      emiAmount,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable,
      startDate: loanStartDate,
      endDate: schedule[schedule.length - 1].dueDate,
    },
    schedule,
  };
};

/**
 * Calculate total interest for a loan
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {string} interestType - 'reducing' or 'flat'
 * @returns {number} - Total interest amount
 */
const calculateTotalInterest = (principal, annualRate, tenureMonths, interestType = 'reducing') => {
  const emi = calculateEMI(principal, annualRate, tenureMonths, interestType);
  const totalPayable = emi * tenureMonths;
  return Math.round((totalPayable - principal) * 100) / 100;
};

/**
 * Calculate outstanding principal after N EMIs paid
 * @param {number} principal - Original principal
 * @param {number} annualRate - Annual interest rate
 * @param {number} tenureMonths - Total tenure
 * @param {number} emisPaid - Number of EMIs already paid
 * @param {string} interestType - 'reducing' or 'flat'
 * @returns {number} - Outstanding principal
 */
const calculateOutstandingPrincipal = (
  principal,
  annualRate,
  tenureMonths,
  emisPaid,
  interestType = 'reducing'
) => {
  if (emisPaid >= tenureMonths) return 0;
  if (emisPaid <= 0) return principal;

  const { schedule } = generateAmortizationSchedule(
    principal,
    annualRate,
    tenureMonths,
    new Date(),
    interestType
  );

  return schedule[emisPaid - 1].closingBalance;
};

/**
 * Calculate prepayment/foreclosure amount
 * @param {number} outstandingPrincipal - Current outstanding principal
 * @param {number} pendingInterest - Any accrued interest
 * @param {number} prepaymentPenaltyRate - Penalty rate (percentage)
 * @returns {Object} - Foreclosure details
 */
const calculateForeclosureAmount = (
  outstandingPrincipal,
  pendingInterest = 0,
  prepaymentPenaltyRate = 0
) => {
  const penalty = Math.round((outstandingPrincipal * prepaymentPenaltyRate) / 100 * 100) / 100;
  const totalAmount = Math.round((outstandingPrincipal + pendingInterest + penalty) * 100) / 100;

  return {
    outstandingPrincipal,
    pendingInterest,
    prepaymentPenalty: penalty,
    totalForeclosureAmount: totalAmount,
  };
};

/**
 * Calculate late payment penalty
 * @param {number} emiAmount - EMI amount
 * @param {number} daysLate - Number of days late
 * @param {Object} penaltyConfig - Penalty configuration
 * @returns {number} - Penalty amount
 */
const calculateLatePenalty = (emiAmount, daysLate, penaltyConfig = {}) => {
  const {
    type = 'percentage', // 'percentage', 'fixed_per_day', 'percentage_per_day'
    rate = 2,
    gracePeriod = 0,
    maxPenalty = null, // Maximum penalty cap
  } = penaltyConfig;

  if (daysLate <= gracePeriod) return 0;

  const effectiveDaysLate = daysLate - gracePeriod;
  let penalty = 0;

  switch (type) {
    case 'percentage':
      // One-time percentage of EMI
      penalty = (emiAmount * rate) / 100;
      break;
    case 'fixed_per_day':
      // Fixed amount per day
      penalty = rate * effectiveDaysLate;
      break;
    case 'percentage_per_day':
      // Percentage of EMI per day
      penalty = (emiAmount * rate * effectiveDaysLate) / 100;
      break;
    default:
      penalty = (emiAmount * rate) / 100;
  }

  // Apply maximum penalty cap if specified
  if (maxPenalty !== null && penalty > maxPenalty) {
    penalty = maxPenalty;
  }

  return Math.round(penalty * 100) / 100;
};

/**
 * Calculate loan eligibility based on income
 * General rule: EMI should not exceed 40-50% of monthly income
 * @param {number} monthlyIncome - Monthly income
 * @param {number} existingEMIs - Sum of existing EMIs
 * @param {number} annualRate - Interest rate
 * @param {number} tenureMonths - Loan tenure
 * @param {number} emiToIncomeRatio - Max allowed EMI to income ratio (default 0.5)
 * @returns {Object} - Eligibility details
 */
const calculateLoanEligibility = (
  monthlyIncome,
  existingEMIs = 0,
  annualRate,
  tenureMonths,
  emiToIncomeRatio = 0.5
) => {
  const maxEMI = monthlyIncome * emiToIncomeRatio - existingEMIs;

  if (maxEMI <= 0) {
    return {
      eligible: false,
      maxEMI: 0,
      maxLoanAmount: 0,
      reason: 'Existing EMIs exceed the allowed EMI to income ratio',
    };
  }

  // Reverse calculate max principal from max EMI
  const monthlyRate = annualRate / 12 / 100;
  const maxPrincipal =
    (maxEMI * (Math.pow(1 + monthlyRate, tenureMonths) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));

  return {
    eligible: true,
    maxEMI: Math.round(maxEMI * 100) / 100,
    maxLoanAmount: Math.round(maxPrincipal * 100) / 100,
    emiToIncomeRatio,
  };
};

module.exports = {
  calculateEMI,
  generateAmortizationSchedule,
  calculateTotalInterest,
  calculateOutstandingPrincipal,
  calculateForeclosureAmount,
  calculateLatePenalty,
  calculateLoanEligibility,
};
