// server/src/utils/fileUpload.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Base upload directory (whitelisted)
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/kyc', 'uploads/profile', 'uploads/documents'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Allowed file types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  document: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
};

// Max file sizes (in bytes)
const MAX_FILE_SIZE = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
};

// Magic number signatures for file validation
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xE2],
    [0xFF, 0xD8, 0xFF, 0xE8],
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF....WEBP)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

/**
 * Validate file magic numbers (file signature)
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - Expected MIME type
 * @returns {boolean}
 */
const validateMagicNumber = (buffer, mimetype) => {
  const signatures = FILE_SIGNATURES[mimetype];
  if (!signatures) {
    return false; // Unknown type, reject
  }

  return signatures.some(sig => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        return false;
      }
    }
    return true;
  });
};

/**
 * Sanitize and validate file path to prevent path traversal
 * @param {string} filePath - File path to validate
 * @returns {string|null} - Safe path or null if invalid
 */
const sanitizeFilePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }

  // Remove any path traversal sequences
  const sanitized = filePath.replace(/\.\./g, '').replace(/\/\//g, '/');

  // Resolve to absolute path
  const resolvedPath = path.resolve(process.cwd(), sanitized);

  // Ensure the resolved path is within the upload directory
  if (!resolvedPath.startsWith(UPLOAD_BASE_DIR)) {
    return null;
  }

  return resolvedPath;
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex'); // Increased randomness
  return `${timestamp}-${random}${ext}`;
};

/**
 * Validate file type
 */
const validateFileType = (mimetype, category = 'document') => {
  const allowed = ALLOWED_TYPES[category] || ALLOWED_TYPES.document;
  return allowed.includes(mimetype);
};

/**
 * Validate file size
 */
const validateFileSize = (size, category = 'document') => {
  const maxSize = MAX_FILE_SIZE[category] || MAX_FILE_SIZE.document;
  return size <= maxSize;
};

/**
 * Save base64 file to disk with security validations
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} folder - Upload folder (kyc, profile, documents)
 * @param {string} originalName - Original file name
 * @returns {object} - { success, url, filename, error }
 */
const saveBase64File = async (base64Data, folder = 'documents', originalName = 'file') => {
  try {
    // Validate folder is whitelisted
    const allowedFolders = ['kyc', 'profile', 'documents'];
    if (!allowedFolders.includes(folder)) {
      throw new Error('Invalid upload folder');
    }

    // Extract mime type and data from base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }

    const mimetype = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Validate file type (MIME check)
    if (!validateFileType(mimetype)) {
      throw new Error('Invalid file type. Allowed: JPG, PNG, PDF');
    }

    // Validate file magic number (actual file content check)
    if (!validateMagicNumber(buffer, mimetype)) {
      throw new Error('File content does not match declared type. Possible file spoofing detected.');
    }

    // Validate file size
    if (!validateFileSize(buffer.length)) {
      throw new Error('File too large. Maximum size: 10MB');
    }

    // Generate filename and path
    const ext = mimetype === 'application/pdf' ? '.pdf' :
                mimetype.includes('png') ? '.png' :
                mimetype.includes('webp') ? '.webp' : '.jpg';
    const filename = generateFileName(originalName.replace(path.extname(originalName), '') + ext);
    const uploadPath = path.join(UPLOAD_BASE_DIR, folder);
    const filePath = path.join(uploadPath, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Final path validation
    const safePath = sanitizeFilePath(`/uploads/${folder}/${filename}`);
    if (!safePath) {
      throw new Error('Invalid file path');
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Return URL path (relative to server)
    const url = `/uploads/${folder}/${filename}`;

    return {
      success: true,
      url,
      filename,
      mimetype,
      size: buffer.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete file from disk with path traversal protection
 * @param {string} fileUrl - URL path of file
 * @returns {boolean}
 */
const deleteFile = (fileUrl) => {
  try {
    if (!fileUrl) return false;

    // Sanitize and validate the path
    const safePath = sanitizeFilePath(fileUrl);
    if (!safePath) {
      console.error('Delete file rejected: Path traversal attempt detected');
      return false;
    }

    // Double-check the path is within uploads directory
    if (!safePath.startsWith(UPLOAD_BASE_DIR)) {
      console.error('Delete file rejected: Path outside upload directory');
      return false;
    }

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Delete file error:', error.message);
    return false;
  }
};

/**
 * Get file info with path validation
 */
const getFileInfo = (fileUrl) => {
  try {
    const safePath = sanitizeFilePath(fileUrl);
    if (!safePath) {
      return null;
    }

    if (!fs.existsSync(safePath)) {
      return null;
    }
    const stats = fs.statSync(safePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (error) {
    return null;
  }
};

module.exports = {
  saveBase64File,
  deleteFile,
  getFileInfo,
  validateFileType,
  validateFileSize,
  validateMagicNumber,
  generateFileName,
  sanitizeFilePath,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  FILE_SIGNATURES,
};
