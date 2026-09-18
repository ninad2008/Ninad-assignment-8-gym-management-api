const passport = require('passport');
const User = require('../models/User');

// @desc    Register new gym member with calculated expiry date
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      membershipTier,
      durationMonths = 1,
      emergencyContact
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Calculate membershipExpiryDate based on duration in months (30 days per month)
    const months = parseInt(durationMonths, 10) > 0 ? parseInt(durationMonths, 10) : 1;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + months * 30);

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      membershipTier: membershipTier || 'Bronze',
      membershipStatus: 'active',
      membershipExpiryDate: expiryDate,
      emergencyContact: emergencyContact || ''
    });

    await newUser.save();

    // Prepare response without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: userResponse
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to register member',
      error: error.message
    });
  }
};

// @desc    Login member with Passport Local Strategy
// @route   POST /api/auth/login
// @access  Public
const login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
        error: err.message
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info && info.message ? info.message : 'Invalid credentials'
      });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({
          success: false,
          message: 'Error establishing login session',
          error: loginErr.message
        });
      }

      // Check expiry upon login
      user.checkExpiry();

      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: userResponse
      });
    });
  })(req, res, next);
};

// @desc    Logout member and destroy session
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
};

// @desc    Fetch active member profile & remaining days
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const now = new Date();
    const expiryDate = new Date(user.membershipExpiryDate);
    const diffTime = expiryDate - now;
    const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Update status if expired
    if (diffTime <= 0 && user.membershipStatus !== 'expired') {
      user.membershipStatus = 'expired';
      await user.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        remainingDays,
        isExpired: diffTime <= 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe
};
