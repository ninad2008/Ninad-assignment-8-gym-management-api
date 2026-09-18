const User = require('../models/User');

const checkActiveMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user session found'
      });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const now = new Date();
    const expiry = new Date(user.membershipExpiryDate);

    // If past expiry date or marked expired
    if (expiry < now || user.membershipStatus === 'expired') {
      if (user.membershipStatus !== 'expired') {
        user.membershipStatus = 'expired';
        await user.save();
      }
      return res.status(400).json({
        success: false,
        message: 'Cannot perform this action: Membership has expired. Please renew your membership.'
      });
    }

    if (user.membershipStatus === 'frozen') {
      return res.status(400).json({
        success: false,
        message: 'Cannot perform this action: Membership is currently frozen.'
      });
    }

    if (user.membershipStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot perform this action: Membership status is ${user.membershipStatus}`
      });
    }

    // Attach fresh user to req
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error verifying membership status',
      error: error.message
    });
  }
};

module.exports = {
  checkActiveMember
};
