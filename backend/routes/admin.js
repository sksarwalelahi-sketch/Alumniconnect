const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(protect, authorize('admin'));

// Dashboard and analytics
router.get('/dashboard', adminController.getDashboard);
router.get('/analytics', adminController.getAnalytics);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/students', adminController.getAllStudentProfiles);
router.get('/alumni', adminController.getAllAlumniProfiles);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Alumni verification
router.get('/pending-verifications', adminController.getPendingVerifications);
router.put('/alumni/:id/verify', adminController.verifyAlumni);

// Mentorship management
router.get('/mentorships', adminController.getAllMentorships);

// Referral management
router.get('/referrals', adminController.getAllReferrals);

module.exports = router;
