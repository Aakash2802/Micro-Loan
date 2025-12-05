// server/src/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');

/**
 * PDF Generator Utility
 * Generates loan statements, EMI receipts, and other documents
 */

/**
 * Format currency in INR
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Format date
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Add header to PDF
 */
const addHeader = (doc, title) => {
  // Company name
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('LoanSphere', { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Micro Loan & EMI Management System', { align: 'center' });

  doc.moveDown(0.5);

  // Title
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title, { align: 'center' });

  doc.moveDown(0.5);

  // Horizontal line
  doc
    .strokeColor('#333333')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke();

  doc.moveDown(1);
};

/**
 * Add footer to PDF
 */
const addFooter = (doc, pageNum) => {
  const bottom = doc.page.height - 50;

  doc
    .fontSize(8)
    .font('Helvetica')
    .text(
      `Generated on ${formatDate(new Date())} | Page ${pageNum}`,
      50,
      bottom,
      { align: 'center', width: doc.page.width - 100 }
    );

  doc.text(
    'This is a computer generated document.',
    50,
    bottom + 12,
    { align: 'center', width: doc.page.width - 100 }
  );
};

/**
 * Generate Loan Statement PDF
 * @param {Object} loanAccount - Loan account document
 * @param {Object} customer - Customer document
 * @param {Array} emis - EMI documents
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateLoanStatement = (loanAccount, customer, emis) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      addHeader(doc, 'LOAN STATEMENT');

      // Loan Account Info Section
      doc.fontSize(11).font('Helvetica-Bold').text('Loan Account Details');
      doc.moveDown(0.3);

      const loanInfo = [
        ['Account Number:', loanAccount.accountNumber],
        ['Status:', loanAccount.status.toUpperCase()],
        ['Loan Start Date:', formatDate(loanAccount.startDate)],
        ['Maturity Date:', formatDate(loanAccount.endDate)],
      ];

      doc.fontSize(10).font('Helvetica');
      loanInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });

      doc.moveDown(1);

      // Customer Info Section
      doc.fontSize(11).font('Helvetica-Bold').text('Customer Details');
      doc.moveDown(0.3);

      const customerInfo = [
        ['Name:', customer.fullName],
        ['Phone:', customer.phone],
        ['Address:', customer.fullAddress || '-'],
      ];

      doc.fontSize(10).font('Helvetica');
      customerInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });

      doc.moveDown(1);

      // Financial Summary Section
      doc.fontSize(11).font('Helvetica-Bold').text('Financial Summary');
      doc.moveDown(0.3);

      const financialInfo = [
        ['Principal Amount:', formatCurrency(loanAccount.principal)],
        ['Interest Rate:', `${loanAccount.interestRate}% p.a.`],
        ['Tenure:', `${loanAccount.tenureMonths} months`],
        ['EMI Amount:', formatCurrency(loanAccount.emiAmount)],
        ['Total Payable:', formatCurrency(loanAccount.totalPayable)],
        ['Total Paid:', formatCurrency(loanAccount.totalPaid)],
        ['Outstanding:', formatCurrency(loanAccount.outstandingAmount)],
        ['Total Penalty:', formatCurrency(loanAccount.totalPenalty)],
      ];

      doc.fontSize(10).font('Helvetica');

      // Two column layout for financial info
      const startX = 50;
      const midX = 300;
      let currentY = doc.y;

      financialInfo.forEach(([label, value], index) => {
        const x = index % 2 === 0 ? startX : midX;
        if (index % 2 === 0 && index !== 0) {
          currentY = doc.y;
        }
        if (index % 2 === 1) {
          doc.y = currentY;
        }
        doc.text(`${label} ${value}`, x, doc.y);
      });

      doc.moveDown(1.5);

      // EMI Schedule Table
      doc.fontSize(11).font('Helvetica-Bold').text('EMI Schedule');
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const tableHeaders = ['#', 'Due Date', 'EMI Amount', 'Principal', 'Interest', 'Status', 'Paid Date'];
      const colWidths = [25, 70, 75, 70, 70, 60, 70];
      let xPos = 50;

      doc.fontSize(9).font('Helvetica-Bold');
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      // Table header line
      doc.y = tableTop + 15;
      doc
        .strokeColor('#333333')
        .lineWidth(0.5)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();

      doc.y += 5;

      // Table rows
      doc.fontSize(8).font('Helvetica');

      emis.forEach((emi, index) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          doc.y = 50;
        }

        xPos = 50;
        const rowY = doc.y;

        const rowData = [
          emi.sequence.toString(),
          formatDate(emi.dueDate),
          formatCurrency(emi.amount),
          formatCurrency(emi.principalComponent),
          formatCurrency(emi.interestComponent),
          emi.status.toUpperCase(),
          emi.paidDate ? formatDate(emi.paidDate) : '-',
        ];

        // Color code status
        const statusColors = {
          paid: '#28a745',
          pending: '#ffc107',
          overdue: '#dc3545',
          partial: '#fd7e14',
        };

        rowData.forEach((data, i) => {
          if (i === 5) {
            doc.fillColor(statusColors[emi.status] || '#333333');
          } else {
            doc.fillColor('#333333');
          }
          doc.text(data, xPos, rowY, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        doc.y = rowY + 15;

        // Row separator line
        doc
          .strokeColor('#cccccc')
          .lineWidth(0.25)
          .moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .stroke();

        doc.y += 5;
      });

      doc.fillColor('#333333');

      // Risk Score Section
      if (loanAccount.riskScore !== undefined) {
        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica-Bold').text('Credit/Risk Score');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Score: ${loanAccount.riskScore}/100`);
        doc.text(`Risk Category: ${loanAccount.riskCategory || 'N/A'}`);
      }

      // Add page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addFooter(doc, i + 1);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate EMI Receipt PDF
 * @param {Object} emi - EMI document
 * @param {Object} loanAccount - Loan account document
 * @param {Object} customer - Customer document
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateEMIReceipt = (emi, loanAccount, customer) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 40,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('LoanSphere', { align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EMI PAYMENT RECEIPT', { align: 'center' });

      doc.moveDown(1);

      // Receipt Details
      doc.fontSize(10).font('Helvetica');

      const receiptInfo = [
        ['Receipt No:', `RCP-${emi._id.toString().slice(-8).toUpperCase()}`],
        ['Date:', formatDate(emi.paidDate)],
        ['', ''],
        ['Loan A/C No:', loanAccount.accountNumber],
        ['Customer Name:', customer.fullName],
        ['Phone:', customer.phone],
        ['', ''],
        ['EMI Number:', `${emi.sequence} of ${loanAccount.totalEMIs}`],
        ['Due Date:', formatDate(emi.dueDate)],
        ['Payment Date:', formatDate(emi.paidDate)],
        ['Payment Mode:', emi.paymentMode?.toUpperCase() || 'N/A'],
        ['Reference:', emi.paymentReference || 'N/A'],
      ];

      receiptInfo.forEach(([label, value]) => {
        if (label === '') {
          doc.moveDown(0.5);
        } else {
          doc.text(`${label} ${value}`);
        }
      });

      doc.moveDown(1);

      // Payment breakdown box
      doc
        .rect(40, doc.y, doc.page.width - 80, 100)
        .stroke();

      const boxY = doc.y + 10;
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Breakdown', 50, boxY);

      doc.fontSize(10).font('Helvetica');
      doc.text(`EMI Amount: ${formatCurrency(emi.amount)}`, 50, boxY + 20);
      doc.text(`Principal: ${formatCurrency(emi.principalComponent)}`, 50, boxY + 35);
      doc.text(`Interest: ${formatCurrency(emi.interestComponent)}`, 50, boxY + 50);

      if (emi.penaltyAmount > 0) {
        doc.text(`Late Penalty: ${formatCurrency(emi.penaltyAmount)}`, 50, boxY + 65);
        doc.font('Helvetica-Bold').text(`Total Paid: ${formatCurrency(emi.paidAmount)}`, 50, boxY + 80);
      } else {
        doc.font('Helvetica-Bold').text(`Total Paid: ${formatCurrency(emi.paidAmount)}`, 50, boxY + 65);
      }

      doc.y = boxY + 110;

      // Outstanding balance
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Outstanding Principal: ${formatCurrency(loanAccount.outstandingPrincipal)}`);
      doc.text(`EMIs Remaining: ${loanAccount.unpaidEMIs}`);

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica');
      doc.text('This is a computer generated receipt and does not require signature.', {
        align: 'center',
      });
      doc.text(`Generated on ${formatDate(new Date())}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Payment Summary Report PDF (for admin)
 * @param {Object} reportData - Report data with summary and transactions
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generatePaymentSummaryReport = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      addHeader(doc, 'PAYMENT SUMMARY REPORT');

      // Date Range
      doc.fontSize(10).font('Helvetica');
      doc.text(`Report Period: ${formatDate(reportData.startDate)} to ${formatDate(reportData.endDate)}`);
      doc.moveDown(1);

      // Summary Stats
      doc.fontSize(11).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.3);

      const summary = reportData.summary || {};
      const summaryInfo = [
        ['Total Collections:', formatCurrency(summary.totalCollected)],
        ['Total Transactions:', summary.totalTransactions?.toString() || '0'],
        ['Total Penalty Collected:', formatCurrency(summary.totalPenalty)],
        ['Average EMI:', formatCurrency(summary.averageEmi)],
      ];

      doc.fontSize(10).font('Helvetica');
      summaryInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });

      doc.moveDown(1);

      // Transactions table (if included)
      if (reportData.transactions && reportData.transactions.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('Recent Transactions');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const headers = ['Date', 'Loan A/C', 'Customer', 'Amount', 'Mode'];
        const colWidths = [80, 100, 120, 80, 80];
        let xPos = 50;

        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i] });
          xPos += colWidths[i];
        });

        doc.y = tableTop + 15;
        doc.strokeColor('#333333').lineWidth(0.5)
          .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.y += 5;

        doc.fontSize(8).font('Helvetica');
        reportData.transactions.slice(0, 50).forEach((txn) => {
          if (doc.y > doc.page.height - 80) {
            doc.addPage();
            doc.y = 50;
          }

          xPos = 50;
          const rowY = doc.y;

          const rowData = [
            formatDate(txn.date),
            txn.accountNumber || '-',
            txn.customerName || '-',
            formatCurrency(txn.amount),
            txn.mode || '-',
          ];

          rowData.forEach((data, i) => {
            doc.text(data, xPos, rowY, { width: colWidths[i] });
            xPos += colWidths[i];
          });

          doc.y = rowY + 12;
        });
      }

      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addFooter(doc, i + 1);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate EMI Schedule PDF
 * @param {Object} loanAccount - Loan account document
 * @param {Object} customer - Customer document
 * @param {Array} emis - EMI documents
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateEMISchedulePDF = (loanAccount, customer, emis) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      addHeader(doc, 'EMI PAYMENT SCHEDULE');

      // Loan & Customer Info in two columns
      const infoStartY = doc.y;

      // Left column - Loan Details
      doc.fontSize(10).font('Helvetica-Bold').text('Loan Details', 40, infoStartY);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Account: ${loanAccount.accountNumber}`, 40, infoStartY + 15);
      doc.text(`Product: ${loanAccount.productId?.name || 'N/A'}`, 40, infoStartY + 28);
      doc.text(`Principal: ${formatCurrency(loanAccount.principal)}`, 40, infoStartY + 41);
      doc.text(`Interest: ${loanAccount.interestRate}% p.a.`, 40, infoStartY + 54);
      doc.text(`Tenure: ${loanAccount.tenureMonths} months`, 40, infoStartY + 67);

      // Right column - Customer Details
      doc.fontSize(10).font('Helvetica-Bold').text('Customer Details', 300, infoStartY);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Name: ${customer.fullName}`, 300, infoStartY + 15);
      doc.text(`Phone: ${customer.phone}`, 300, infoStartY + 28);
      doc.text(`Status: ${loanAccount.status.toUpperCase()}`, 300, infoStartY + 41);
      doc.text(`EMI Amount: ${formatCurrency(loanAccount.emiAmount)}`, 300, infoStartY + 54);
      doc.text(`Start Date: ${formatDate(loanAccount.startDate)}`, 300, infoStartY + 67);

      doc.y = infoStartY + 90;

      // Summary Box
      doc.rect(40, doc.y, doc.page.width - 80, 50).fillAndStroke('#f8f9fa', '#dee2e6');

      const boxY = doc.y + 10;
      const boxWidth = (doc.page.width - 80) / 4;

      doc.fillColor('#333333').fontSize(8).font('Helvetica');

      // Total Payable
      doc.text('Total Payable', 50, boxY);
      doc.fontSize(11).font('Helvetica-Bold').text(formatCurrency(loanAccount.totalPayable), 50, boxY + 12);

      // Total Paid
      doc.fontSize(8).font('Helvetica').text('Total Paid', 50 + boxWidth, boxY);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#28a745').text(formatCurrency(loanAccount.totalPaid || 0), 50 + boxWidth, boxY + 12);

      // Outstanding
      doc.fontSize(8).font('Helvetica').fillColor('#333333').text('Outstanding', 50 + boxWidth * 2, boxY);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc3545').text(formatCurrency(loanAccount.outstandingAmount), 50 + boxWidth * 2, boxY + 12);

      // EMIs Paid
      doc.fontSize(8).font('Helvetica').fillColor('#333333').text('EMIs Progress', 50 + boxWidth * 3, boxY);
      const paidEmis = emis.filter(e => e.status === 'paid').length;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#007bff').text(`${paidEmis} / ${loanAccount.totalEMIs}`, 50 + boxWidth * 3, boxY + 12);

      doc.fillColor('#333333');
      doc.y = boxY + 55;

      // EMI Schedule Table
      doc.fontSize(11).font('Helvetica-Bold').text('Payment Schedule', 40);
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const headers = ['#', 'Due Date', 'EMI Amount', 'Principal', 'Interest', 'Balance', 'Status', 'Paid On'];
      const colWidths = [25, 65, 70, 65, 60, 70, 55, 65];
      let xPos = 40;

      // Header background
      doc.rect(40, tableTop - 5, doc.page.width - 80, 20).fill('#e9ecef');

      doc.fillColor('#333333').fontSize(8).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: i > 1 && i < 6 ? 'right' : 'left' });
        xPos += colWidths[i];
      });

      doc.y = tableTop + 18;

      // Table rows
      doc.fontSize(8).font('Helvetica');

      emis.forEach((emi, index) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          doc.y = 50;

          // Repeat header on new page
          xPos = 40;
          doc.rect(40, doc.y - 5, doc.page.width - 80, 20).fill('#e9ecef');
          doc.fillColor('#333333').fontSize(8).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            doc.text(header, xPos, doc.y, { width: colWidths[i], align: i > 1 && i < 6 ? 'right' : 'left' });
            xPos += colWidths[i];
          });
          doc.y += 18;
          doc.font('Helvetica');
        }

        xPos = 40;
        const rowY = doc.y;

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(40, rowY - 3, doc.page.width - 80, 16).fill('#f8f9fa');
        }

        // Status colors
        const statusColors = {
          paid: '#28a745',
          pending: '#007bff',
          overdue: '#dc3545',
          partial: '#fd7e14',
          waived: '#6c757d'
        };

        const rowData = [
          emi.sequence.toString(),
          formatDate(emi.dueDate),
          formatCurrency(emi.amount),
          formatCurrency(emi.principalComponent),
          formatCurrency(emi.interestComponent),
          formatCurrency(emi.closingBalance || 0),
          emi.status.toUpperCase(),
          emi.paidDate ? formatDate(emi.paidDate) : '-',
        ];

        doc.fillColor('#333333');
        rowData.forEach((data, i) => {
          if (i === 6) {
            doc.fillColor(statusColors[emi.status] || '#333333');
            doc.font('Helvetica-Bold');
          }
          const align = i > 1 && i < 6 ? 'right' : 'left';
          doc.text(data, xPos, rowY, { width: colWidths[i], align });
          xPos += colWidths[i];
          if (i === 6) {
            doc.fillColor('#333333');
            doc.font('Helvetica');
          }
        });

        doc.y = rowY + 14;
      });

      // Interest Summary at the bottom
      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica-Bold').text('Interest Summary', 40);
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');

      const totalPrincipal = loanAccount.principal;
      const totalInterest = loanAccount.totalInterest;
      const interestPercentage = ((totalInterest / totalPrincipal) * 100).toFixed(2);

      doc.text(`Total Principal: ${formatCurrency(totalPrincipal)}   |   Total Interest: ${formatCurrency(totalInterest)}   |   Interest Ratio: ${interestPercentage}%`, 40);

      // Add page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addFooter(doc, i + 1);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateLoanStatement,
  generateEMIReceipt,
  generatePaymentSummaryReport,
  generateEMISchedulePDF,
  formatCurrency,
  formatDate,
};
