const express = require('express');
const router = express.Router();
const { renewMembership, getExpiredMembers } = require('../controllers/memberController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Note: Put static subpaths before parameterized paths (:id)
// @route   GET /api/members/expired
router.get('/expired', ensureAuthenticated, getExpiredMembers);

// @route   PATCH /api/members/:id/renew
router.patch('/:id/renew', ensureAuthenticated, renewMembership);

module.exports = router;
