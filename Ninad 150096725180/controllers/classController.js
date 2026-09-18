const FitnessClass = require('../models/FitnessClass');
const mongoose = require('mongoose');

// @desc    Fetch all upcoming fitness classes (supports ?trainer=John)
// @route   GET /api/classes
// @access  Public
const getAllClasses = async (req, res) => {
  try {
    const { trainer } = req.query;
    const filter = {};

    if (trainer) {
      filter.trainerName = { $regex: new RegExp(trainer.trim(), 'i') };
    }

    const classes = await FitnessClass.find(filter)
      .populate('enrolledMembers', 'username email membershipTier membershipStatus')
      .sort({ scheduleDate: 1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch fitness classes',
      error: error.message
    });
  }
};

// @desc    Get class details with enrolled members list
// @route   GET /api/classes/:id
// @access  Public
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id)
      .populate('enrolledMembers', 'username email membershipTier membershipStatus emergencyContact');

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...fitnessClass.toObject(),
        availableSeats: fitnessClass.maxCapacity - fitnessClass.enrolledMembers.length,
        isFull: fitnessClass.enrolledMembers.length >= fitnessClass.maxCapacity
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class details',
      error: error.message
    });
  }
};

// @desc    Create a new workout class
// @route   POST /api/classes
// @access  Private
const createClass = async (req, res) => {
  try {
    const { title, trainerName, scheduleDate, durationMinutes, maxCapacity } = req.body;

    if (!title || !trainerName || !scheduleDate || maxCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, trainerName, scheduleDate, and maxCapacity are required'
      });
    }

    const capacityNum = parseInt(maxCapacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxCapacity must be an integer greater than or equal to 1'
      });
    }

    const newClass = new FitnessClass({
      title: title.trim(),
      trainerName: trainerName.trim(),
      scheduleDate: new Date(scheduleDate),
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 60,
      maxCapacity: capacityNum,
      enrolledMembers: []
    });

    await newClass.save();

    return res.status(201).json({
      success: true,
      message: 'Fitness class created successfully',
      data: newClass
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create fitness class',
      error: error.message
    });
  }
};

// @desc    Enroll logged-in user into fitness class
// @route   POST /api/classes/:id/book
// @access  Private (Authenticated & Active Member)
const bookClass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if user is already enrolled
    const isAlreadyEnrolled = fitnessClass.enrolledMembers.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Member is already enrolled in this class'
      });
    }

    // Check class capacity
    if (fitnessClass.enrolledMembers.length >= fitnessClass.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Class capacity reached'
      });
    }

    // Enroll member
    fitnessClass.enrolledMembers.push(userId);
    await fitnessClass.save();

    await fitnessClass.populate('enrolledMembers', 'username email membershipTier membershipStatus');

    return res.status(200).json({
      success: true,
      message: 'Successfully enrolled in class',
      data: fitnessClass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to book class',
      error: error.message
    });
  }
};

// @desc    Cancel member booking from class
// @route   DELETE /api/classes/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    const enrolledIndex = fitnessClass.enrolledMembers.findIndex(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (enrolledIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Member is not booked in this class'
      });
    }

    fitnessClass.enrolledMembers.splice(enrolledIndex, 1);
    await fitnessClass.save();

    return res.status(200).json({
      success: true,
      message: 'Class booking cancelled successfully',
      data: fitnessClass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  bookClass,
  cancelBooking
};
