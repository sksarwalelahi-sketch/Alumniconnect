const express = require('express');
const router = express.Router();
const { studentController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware');

// All routes require authentication
router.use(protect);

// Student routes
router.get('/profile', studentController.getProfile);
router.get('/public/:id', studentController.getPublicProfileById);
router.put('/profile', authorize('student'), studentController.createOrUpdateProfile);
router.put('/profile-photo', authorize('student'), uploadSingle('photo'), studentController.uploadProfilePhoto);
router.put('/resume', authorize('student'), uploadSingle('resume'), studentController.uploadResume);
router.put('/notifications', studentController.updateNotifications);

// Admin only routes
router.get('/', authorize('admin'), studentController.getAllStudents);
router.get('/stats', authorize('admin'), studentController.getStudentStats);
router.get('/:id', authorize('admin'), studentController.getStudentById);

module.exports = router;
