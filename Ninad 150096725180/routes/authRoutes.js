const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);

// @route   POST /api/auth/logout
router.post('/logout', ensureAuthenticated, logout);

// @route   GET /api/auth/me
router.get('/me', ensureAuthenticated, getMe);

module.exports = router;
