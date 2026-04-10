const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgotpassword', authController.forgotPassword);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);
router.put('/updatepassword', protect, authController.updatePassword);

module.exports = router;
