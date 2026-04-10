const express = require('express');
const router = express.Router();
const { alumniController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware');

// All routes require authentication
router.use(protect);

// Alumni routes
router.get('/profile', authorize('alumni'), alumniController.getProfile);
router.put('/profile', authorize('alumni'), alumniController.createOrUpdateProfile);
router.put('/profile-photo', authorize('alumni'), uploadSingle('photo'), alumniController.uploadProfilePhoto);
router.put('/mentorship-slots', authorize('alumni'), alumniController.updateMentorshipSlots);
router.put('/availability', authorize('alumni'), alumniController.toggleAvailability);
router.post('/achievements', authorize('alumni'), alumniController.addAchievement);
router.post('/media', authorize('alumni'), uploadSingle('media'), alumniController.addMediaPost);

// Public routes
router.get('/', alumniController.getAllAlumni);
router.get('/:id', alumniController.getAlumniById);

// Admin only routes
router.get('/stats', authorize('admin'), alumniController.getAlumniStats);

module.exports = router;
