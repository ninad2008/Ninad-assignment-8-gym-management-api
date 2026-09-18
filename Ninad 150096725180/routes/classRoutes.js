const express = require('express');
const router = express.Router();
const {
  getAllClasses,
  getClassById,
  createClass,
  bookClass,
  cancelBooking
} = require('../controllers/classController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { checkActiveMember } = require('../middleware/checkActiveMember');

// @route   GET /api/classes
router.get('/', getAllClasses);

// @route   GET /api/classes/:id
router.get('/:id', getClassById);

// @route   POST /api/classes
router.post('/', ensureAuthenticated, createClass);

// @route   POST /api/classes/:id/book
router.post('/:id/book', ensureAuthenticated, checkActiveMember, bookClass);

// @route   DELETE /api/classes/:id/cancel
router.delete('/:id/cancel', ensureAuthenticated, cancelBooking);

module.exports = router;
