const express = require('express');
const router = express.Router();
const { mentorshipController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Request routes
router.post('/request', authorize('student'), mentorshipController.sendRequest);
router.get('/requests', mentorshipController.getRequests);
router.get('/pending', authorize('alumni'), mentorshipController.getPendingRequests);

// Specific request operations
router.put('/:id/cancel', authorize('student'), mentorshipController.cancelRequest);
router.put('/:id/respond', authorize('alumni'), mentorshipController.respondToRequest);
router.put('/:id/complete', mentorshipController.completeMentorship);

// Session routes
router.post('/:id/session', mentorshipController.scheduleSession);
router.put('/:requestId/session/:sessionId', mentorshipController.updateSession);

// Stats
router.get('/stats', mentorshipController.getStats);

module.exports = router;
