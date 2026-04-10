const express = require('express');
const router = express.Router();
const { referralController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Request routes
router.post('/request', authorize('student'), referralController.sendRequest);
router.get('/requests', referralController.getRequests);
router.get('/pending', authorize('alumni'), referralController.getPendingRequests);

// Specific request operations
router.put('/:id', authorize('alumni'), referralController.updateRequest);
router.put('/:id/review', authorize('alumni'), referralController.startReview);
router.put('/:id/submit', authorize('alumni'), referralController.submitReferral);
router.put('/:id/withdraw', authorize('student'), referralController.withdrawRequest);

// Stats
router.get('/stats', referralController.getStats);

module.exports = router;
