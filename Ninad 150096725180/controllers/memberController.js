const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Renew / extend membership expiry date
// @route   PATCH /api/members/:id/renew
// @access  Private
const renewMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalMonths = 1, tier } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Member not found: Invalid ID'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const months = parseInt(additionalMonths, 10);
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({
        success: false,
        message: 'additionalMonths must be a positive number'
      });
    }

    const now = new Date();
    let baseDate = new Date(user.membershipExpiryDate);

    // If already expired or invalid, start renewal from current time
    if (isNaN(baseDate.getTime()) || baseDate < now) {
      baseDate = new Date();
    }

    // Extend by additionalMonths * 30 days
    baseDate.setDate(baseDate.getDate() + months * 30);
    user.membershipExpiryDate = baseDate;
    user.membershipStatus = 'active';

    if (tier) {
      const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
      if (validTiers.includes(tier)) {
        user.membershipTier = tier;
      }
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      data: userResponse
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to renew membership',
      error: error.message
    });
  }
};

// @desc    Get list of all expired memberships
// @route   GET /api/members/expired
// @access  Private
const getExpiredMembers = async (req, res) => {
  try {
    const now = new Date();

    // Query for expired dates or expired status
    const expiredMembers = await User.find({
      $or: [
        { membershipExpiryDate: { $lt: now } },
        { membershipStatus: 'expired' }
      ]
    }).select('-password').sort({ membershipExpiryDate: -1 });

    // Update statuses to 'expired' for consistency
    await User.updateMany(
      {
        membershipExpiryDate: { $lt: now },
        membershipStatus: { $ne: 'expired' }
      },
      {
        $set: { membershipStatus: 'expired' }
      }
    );

    return res.status(200).json({
      success: true,
      count: expiredMembers.length,
      data: expiredMembers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expired members',
      error: error.message
    });
  }
};

module.exports = {
  renewMembership,
  getExpiredMembers
};
