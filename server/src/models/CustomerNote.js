// server/src/models/CustomerNote.js
const mongoose = require('mongoose');

const customerNoteSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['general', 'call', 'visit', 'email', 'sms', 'payment', 'complaint', 'follow_up', 'important'],
      default: 'general',
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxLength: [2000, 'Note cannot exceed 2000 characters'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    followUpCompleted: {
      type: Boolean,
      default: false,
    },
    attachments: [{
      fileName: String,
      filePath: String,
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    // For tracking edits
    editHistory: [{
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      editedAt: { type: Date, default: Date.now },
      previousContent: String,
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
customerNoteSchema.index({ customerId: 1, createdAt: -1 });
customerNoteSchema.index({ customerId: 1, type: 1 });
customerNoteSchema.index({ followUpDate: 1, followUpCompleted: 1 });

// Static method to get notes for a customer
customerNoteSchema.statics.getCustomerNotes = async function(customerId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    includeDeleted = false,
    pinnedFirst = true
  } = options;

  const query = { customerId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  if (type) {
    query.type = type;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let sortCriteria = { createdAt: -1 };
  if (pinnedFirst) {
    sortCriteria = { isPinned: -1, createdAt: -1 };
  }

  const [notes, total] = await Promise.all([
    this.find(query)
      .populate('createdBy', 'name email role')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit)),
    this.countDocuments(query),
  ]);

  return {
    notes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// Static method to get pending follow-ups
customerNoteSchema.statics.getPendingFollowUps = async function(userId = null, days = 7) {
  const query = {
    isDeleted: false,
    followUpDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
    followUpCompleted: false,
  };

  if (userId) {
    query.createdBy = userId;
  }

  return this.find(query)
    .populate('customerId', 'fullName phone')
    .populate('createdBy', 'name')
    .sort({ followUpDate: 1 });
};

// Virtual to check if overdue for follow-up
customerNoteSchema.virtual('isFollowUpOverdue').get(function() {
  if (!this.followUpDate || this.followUpCompleted) return false;
  return new Date(this.followUpDate) < new Date();
});

module.exports = mongoose.model('CustomerNote', customerNoteSchema);
