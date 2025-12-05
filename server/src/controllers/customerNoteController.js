// server/src/controllers/customerNoteController.js
const CustomerNote = require('../models/CustomerNote');
const Customer = require('../models/Customer');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');

/**
 * @desc    Get notes for a customer
 * @route   GET /api/customers/:id/notes
 * @access  Private/Staff
 */
const getCustomerNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, type } = req.query;

  // Verify customer exists
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const result = await CustomerNote.getCustomerNotes(id, {
    page,
    limit,
    type,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Add note to customer
 * @route   POST /api/customers/:id/notes
 * @access  Private/Staff
 */
const addCustomerNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, type, isPinned, isPrivate, followUpDate } = req.body;

  if (!content || !content.trim()) {
    throw new APIError('Note content is required', 400, 'CONTENT_REQUIRED');
  }

  // Verify customer exists
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const note = await CustomerNote.create({
    customerId: id,
    createdBy: req.user.userId,
    content: content.trim(),
    type: type || 'general',
    isPinned: isPinned || false,
    isPrivate: isPrivate || false,
    followUpDate: followUpDate || null,
  });

  // Populate creator info
  await note.populate('createdBy', 'name email role');

  res.status(201).json({
    success: true,
    message: 'Note added successfully',
    data: { note },
  });
});

/**
 * @desc    Update a note
 * @route   PUT /api/customers/:id/notes/:noteId
 * @access  Private/Staff
 */
const updateCustomerNote = asyncHandler(async (req, res) => {
  const { id, noteId } = req.params;
  const { content, type, isPinned, isPrivate, followUpDate, followUpCompleted } = req.body;

  const note = await CustomerNote.findOne({
    _id: noteId,
    customerId: id,
    isDeleted: false,
  });

  if (!note) {
    throw new APIError('Note not found', 404, 'NOTE_NOT_FOUND');
  }

  // Store edit history if content changed
  if (content && content !== note.content) {
    note.editHistory.push({
      editedBy: req.user.userId,
      previousContent: note.content,
    });
    note.content = content.trim();
  }

  // Update other fields
  if (type !== undefined) note.type = type;
  if (isPinned !== undefined) note.isPinned = isPinned;
  if (isPrivate !== undefined) note.isPrivate = isPrivate;
  if (followUpDate !== undefined) note.followUpDate = followUpDate;
  if (followUpCompleted !== undefined) note.followUpCompleted = followUpCompleted;

  await note.save();
  await note.populate('createdBy', 'name email role');

  res.json({
    success: true,
    message: 'Note updated successfully',
    data: { note },
  });
});

/**
 * @desc    Delete a note (soft delete)
 * @route   DELETE /api/customers/:id/notes/:noteId
 * @access  Private/Staff
 */
const deleteCustomerNote = asyncHandler(async (req, res) => {
  const { id, noteId } = req.params;

  const note = await CustomerNote.findOne({
    _id: noteId,
    customerId: id,
    isDeleted: false,
  });

  if (!note) {
    throw new APIError('Note not found', 404, 'NOTE_NOT_FOUND');
  }

  // Soft delete
  note.isDeleted = true;
  note.deletedAt = new Date();
  note.deletedBy = req.user.userId;
  await note.save();

  res.json({
    success: true,
    message: 'Note deleted successfully',
  });
});

/**
 * @desc    Toggle note pin status
 * @route   PATCH /api/customers/:id/notes/:noteId/pin
 * @access  Private/Staff
 */
const toggleNotePin = asyncHandler(async (req, res) => {
  const { id, noteId } = req.params;

  const note = await CustomerNote.findOne({
    _id: noteId,
    customerId: id,
    isDeleted: false,
  });

  if (!note) {
    throw new APIError('Note not found', 404, 'NOTE_NOT_FOUND');
  }

  note.isPinned = !note.isPinned;
  await note.save();

  res.json({
    success: true,
    message: note.isPinned ? 'Note pinned' : 'Note unpinned',
    data: { isPinned: note.isPinned },
  });
});

/**
 * @desc    Mark follow-up as complete
 * @route   PATCH /api/customers/:id/notes/:noteId/complete-followup
 * @access  Private/Staff
 */
const completeFollowUp = asyncHandler(async (req, res) => {
  const { id, noteId } = req.params;

  const note = await CustomerNote.findOne({
    _id: noteId,
    customerId: id,
    isDeleted: false,
    followUpDate: { $ne: null },
  });

  if (!note) {
    throw new APIError('Note not found or has no follow-up', 404, 'NOTE_NOT_FOUND');
  }

  note.followUpCompleted = true;
  await note.save();

  res.json({
    success: true,
    message: 'Follow-up marked as complete',
  });
});

/**
 * @desc    Get pending follow-ups for current user
 * @route   GET /api/customers/notes/follow-ups
 * @access  Private/Staff
 */
const getPendingFollowUps = asyncHandler(async (req, res) => {
  const { days = 7, all = false } = req.query;

  const userId = all === 'true' ? null : req.user.userId;
  const followUps = await CustomerNote.getPendingFollowUps(userId, parseInt(days));

  res.json({
    success: true,
    data: {
      followUps,
      count: followUps.length,
    },
  });
});

/**
 * @desc    Get note types for filtering
 * @route   GET /api/customers/notes/types
 * @access  Private/Staff
 */
const getNoteTypes = asyncHandler(async (req, res) => {
  const types = [
    { id: 'general', label: 'General', icon: 'chat', color: 'gray' },
    { id: 'call', label: 'Phone Call', icon: 'phone', color: 'blue' },
    { id: 'visit', label: 'Visit', icon: 'location', color: 'green' },
    { id: 'email', label: 'Email', icon: 'mail', color: 'purple' },
    { id: 'sms', label: 'SMS', icon: 'message', color: 'cyan' },
    { id: 'payment', label: 'Payment', icon: 'currency', color: 'emerald' },
    { id: 'complaint', label: 'Complaint', icon: 'warning', color: 'red' },
    { id: 'follow_up', label: 'Follow Up', icon: 'clock', color: 'amber' },
    { id: 'important', label: 'Important', icon: 'star', color: 'yellow' },
  ];

  res.json({
    success: true,
    data: { types },
  });
});

module.exports = {
  getCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  toggleNotePin,
  completeFollowUp,
  getPendingFollowUps,
  getNoteTypes,
};
