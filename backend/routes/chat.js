const express = require('express');
const router = express.Router();
const { chatController } = require('../controllers');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Conversation routes
router.get('/conversations', chatController.getConversations);
router.post('/conversation', chatController.getOrCreateConversation);
router.delete('/conversation/:id', chatController.deleteConversation);

// Message routes
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/send', chatController.sendMessage);
router.post('/upload', uploadSingle('file'), chatController.uploadAttachment);

// Utility routes
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
