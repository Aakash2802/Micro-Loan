// server/src/utils/emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates
const templates = {
  applicationSubmitted: (data) => ({
    subject: `Loan Application Received - ${data.applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for submitting your loan application. We have received your request and it is now being processed.
          </p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Application Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.applicationNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Loan Product:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Tenure:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.tenure} months</td>
              </tr>
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Our team will review your application and get back to you shortly. You can track your application status by logging into your account.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),

  applicationRecommended: (data) => ({
    subject: `Good News! Your Application is Recommended - ${data.applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Great news! Your loan application has been reviewed and <strong style="color: #6366F1;">recommended for approval</strong> by our loan officer.
          </p>
          <div style="background: #EEF2FF; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366F1;">
            <p style="color: #4338CA; margin: 0;">
              <strong>Status:</strong> Awaiting Final Approval<br>
              Your application is now pending final approval from our senior management.
            </p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Application Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.applicationNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
              ${data.remarks ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Officer Remarks:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.remarks}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            We will notify you once the final decision is made. Thank you for your patience.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),

  applicationApproved: (data) => ({
    subject: `Congratulations! Your Loan is Approved - ${data.applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: #D1FAE5; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">✓</span>
            </div>
          </div>
          <p style="color: #4b5563; line-height: 1.6; text-align: center; font-size: 18px;">
            <strong style="color: #059669;">Congratulations!</strong> Your loan application has been <strong>approved</strong>.
          </p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Approved Loan Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Application Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.applicationNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Approved Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Tenure:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.tenure} months</td>
              </tr>
              ${data.remarks ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Remarks:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.remarks}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Our team will contact you shortly regarding the loan disbursement process. Please keep your documents ready.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),

  applicationRejected: (data) => ({
    subject: `Update on Your Loan Application - ${data.applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for applying for a loan with LoanSphere. After careful review, we regret to inform you that your loan application could not be approved at this time.
          </p>
          <div style="background: #FEF2F2; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <p style="color: #991B1B; margin: 0;">
              <strong>Application Status:</strong> Not Approved
            </p>
            ${data.reason ? `<p style="color: #7F1D1D; margin: 10px 0 0 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Application Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.applicationNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            You may reapply after addressing the concerns mentioned above, or feel free to contact our support team for more information.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),

  loanDisbursed: (data) => ({
    subject: `Loan Disbursed Successfully - ${data.accountNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your loan has been successfully disbursed! The amount has been transferred to your registered bank account.
          </p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Loan Account Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Account Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.accountNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Principal Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">₹${data.principal.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Disbursed Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669;">₹${data.disbursedAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Monthly EMI:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">₹${data.emiAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">First EMI Date:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.firstEmiDate}</td>
              </tr>
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please ensure timely payment of your EMIs to maintain a good credit score. You can view your EMI schedule and make payments through your account.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),

  paymentReceived: (data) => ({
    subject: `Payment Received - ₹${data.amount.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LoanSphere</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Dear ${data.customerName},</h2>
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: #D1FAE5; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">✓</span>
            </div>
          </div>
          <p style="color: #4b5563; line-height: 1.6; text-align: center; font-size: 18px;">
            We have received your payment of <strong style="color: #059669;">₹${data.amount.toLocaleString('en-IN')}</strong>
          </p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Payment ID:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">EMIs Paid:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.paidEmis?.length || 0} EMI(s)</td>
              </tr>
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for your timely payment. Your payment has been successfully processed and credited to your loan account.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>LoanSphere Team</strong>
          </p>
        </div>
      </div>
    `,
  }),
};

/**
 * Send email using a template
 * @param {string} to - Recipient email
 * @param {string} templateName - Name of the template
 * @param {object} data - Template data
 */
const sendEmail = async (to, templateName, data) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[Email] Would send ${templateName} to ${to} (SMTP not configured)`);
      return { success: false, reason: 'SMTP not configured' };
    }

    const template = templates[templateName];
    if (!template) {
      console.error(`[Email] Template not found: ${templateName}`);
      return { success: false, reason: 'Template not found' };
    }

    const { subject, html } = template(data);

    const mailOptions = {
      from: `"LoanSphere" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent ${templateName} to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send ${templateName} to ${to}:`, error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send notification for loan application status change
 */
const sendApplicationStatusEmail = async (application, customer, status, remarks = null) => {
  if (!customer?.email) {
    console.log('[Email] No customer email for notification');
    return;
  }

  const baseData = {
    customerName: customer.fullName,
    applicationNumber: application.applicationNumber,
    amount: application.requestedAmount,
    tenure: application.requestedTenure,
    productName: application.productId?.name || 'Loan',
    remarks,
  };

  const templateMap = {
    pending: 'applicationSubmitted',
    recommended: 'applicationRecommended',
    approved: 'applicationApproved',
    rejected: 'applicationRejected',
  };

  const templateName = templateMap[status];
  if (templateName) {
    if (status === 'rejected') {
      baseData.reason = remarks;
    }
    await sendEmail(customer.email, templateName, baseData);
  }
};

module.exports = {
  sendEmail,
  sendApplicationStatusEmail,
  templates,
};
