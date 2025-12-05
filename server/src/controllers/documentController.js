// server/src/controllers/documentController.js
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const { saveBase64File, deleteFile } = require('../utils/fileUpload');

/**
 * @desc    Upload KYC document (Customer)
 * @route   POST /api/documents/kyc
 * @access  Private/Customer
 */
const uploadKYCDocument = asyncHandler(async (req, res) => {
  const { type, documentNumber, file } = req.body;

  if (!type || !file) {
    throw new APIError('Document type and file are required', 400, 'MISSING_FIELDS');
  }

  // Validate document type
  const validTypes = ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'bank_statement', 'salary_slip', 'other'];
  if (!validTypes.includes(type)) {
    throw new APIError('Invalid document type', 400, 'INVALID_TYPE');
  }

  // Get customer
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Save file
  const result = await saveBase64File(file, 'kyc', `${type}_${customer._id}`);
  if (!result.success) {
    throw new APIError(result.error, 400, 'UPLOAD_FAILED');
  }

  // Check if document type already exists
  const existingDocIndex = customer.kycDocs.findIndex(doc => doc.type === type);

  if (existingDocIndex !== -1) {
    // Delete old file
    deleteFile(customer.kycDocs[existingDocIndex].url);

    // Update existing document
    customer.kycDocs[existingDocIndex].url = result.url;
    customer.kycDocs[existingDocIndex].documentNumber = documentNumber || '';
    customer.kycDocs[existingDocIndex].verified = false;
    customer.kycDocs[existingDocIndex].verifiedAt = null;
    customer.kycDocs[existingDocIndex].verifiedBy = null;
  } else {
    // Add new document
    customer.kycDocs.push({
      type,
      documentNumber: documentNumber || '',
      url: result.url,
      verified: false,
    });
  }

  // Update KYC status to submitted if pending
  if (customer.kycStatus === 'pending') {
    customer.kycStatus = 'submitted';
  }

  await customer.save();

  // Audit log
  await AuditLog.log({
    type: 'kyc_document_upload',
    userId: req.user.userId,
    customerId: customer._id,
    message: `KYC document uploaded: ${type}`,
    details: { documentType: type },
  });

  res.json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      document: {
        type,
        documentNumber,
        url: result.url,
        verified: false,
      },
    },
  });
});

/**
 * @desc    Get my KYC documents (Customer)
 * @route   GET /api/documents/kyc
 * @access  Private/Customer
 */
const getMyKYCDocuments = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      documents: customer.kycDocs,
      kycStatus: customer.kycStatus,
      kycRemarks: customer.kycRemarks,
    },
  });
});

/**
 * @desc    Delete KYC document (Customer)
 * @route   DELETE /api/documents/kyc/:docId
 * @access  Private/Customer
 */
const deleteKYCDocument = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const docIndex = customer.kycDocs.findIndex(doc => doc._id.toString() === req.params.docId);
  if (docIndex === -1) {
    throw new APIError('Document not found', 404, 'DOC_NOT_FOUND');
  }

  // Cannot delete verified documents
  if (customer.kycDocs[docIndex].verified) {
    throw new APIError('Cannot delete verified documents', 400, 'DOC_VERIFIED');
  }

  // Delete file
  deleteFile(customer.kycDocs[docIndex].url);

  // Remove from array
  const deletedDoc = customer.kycDocs.splice(docIndex, 1)[0];
  await customer.save();

  res.json({
    success: true,
    message: 'Document deleted successfully',
    data: { deletedType: deletedDoc.type },
  });
});

/**
 * @desc    Upload profile photo (Customer)
 * @route   POST /api/documents/profile-photo
 * @access  Private/Customer
 */
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const { file } = req.body;

  if (!file) {
    throw new APIError('File is required', 400, 'MISSING_FILE');
  }

  const customer = await Customer.findOne({ userId: req.user.userId });
  if (!customer) {
    throw new APIError('Customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Save file
  const result = await saveBase64File(file, 'profile', `photo_${customer._id}`);
  if (!result.success) {
    throw new APIError(result.error, 400, 'UPLOAD_FAILED');
  }

  // Delete old photo if exists
  if (customer.profilePhoto) {
    deleteFile(customer.profilePhoto);
  }

  // Update customer
  customer.profilePhoto = result.url;
  await customer.save();

  res.json({
    success: true,
    message: 'Profile photo updated successfully',
    data: { url: result.url },
  });
});

/**
 * @desc    Verify KYC document (Staff)
 * @route   PATCH /api/documents/kyc/:customerId/:docId/verify
 * @access  Private/Staff
 */
const verifyKYCDocument = asyncHandler(async (req, res) => {
  const { customerId, docId } = req.params;
  const { verified, remarks } = req.body;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const doc = customer.kycDocs.id(docId);
  if (!doc) {
    throw new APIError('Document not found', 404, 'DOC_NOT_FOUND');
  }

  doc.verified = verified;
  doc.verifiedAt = verified ? new Date() : null;
  doc.verifiedBy = verified ? req.user.userId : null;

  // Check if all required docs are verified
  const requiredDocs = ['aadhaar', 'pan'];
  const verifiedDocs = customer.kycDocs.filter(d => d.verified).map(d => d.type);
  const allVerified = requiredDocs.every(d => verifiedDocs.includes(d));

  if (allVerified) {
    customer.kycStatus = 'verified';
  } else if (customer.kycDocs.length > 0) {
    customer.kycStatus = 'submitted';
  }

  if (remarks) {
    customer.kycRemarks = remarks;
  }

  await customer.save();

  // Audit log
  await AuditLog.log({
    type: 'kyc_document_verify',
    userId: req.user.userId,
    customerId: customer._id,
    message: `KYC document ${verified ? 'verified' : 'rejected'}: ${doc.type}`,
    details: { documentType: doc.type, verified, remarks },
  });

  res.json({
    success: true,
    message: `Document ${verified ? 'verified' : 'rejected'} successfully`,
    data: {
      document: doc,
      kycStatus: customer.kycStatus,
    },
  });
});

/**
 * @desc    Get customer KYC documents (Staff)
 * @route   GET /api/documents/kyc/:customerId
 * @access  Private/Staff
 */
const getCustomerKYCDocuments = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.customerId);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      documents: customer.kycDocs,
      kycStatus: customer.kycStatus,
      kycRemarks: customer.kycRemarks,
    },
  });
});

module.exports = {
  uploadKYCDocument,
  getMyKYCDocuments,
  deleteKYCDocument,
  uploadProfilePhoto,
  verifyKYCDocument,
  getCustomerKYCDocuments,
};
