const express = require('express');
const router = express.Router();
const { matchController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Student routes - AI matching
router.get('/mentors', authorize('student'), matchController.getMatchedMentors);
router.get('/score/:alumniId', authorize('student'), matchController.getMatchScore);
router.get('/search', authorize('student'), matchController.searchMentors);

// Admin routes
router.get('/stats', authorize('admin'), matchController.getMatchStats);

module.exports = router;
