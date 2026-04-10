require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const jwt = require('jsonwebtoken');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket.io authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;

        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    const { ChatMessage, Conversation } = require('./models/ChatMessage');

    const emitConversationUpdate = async (conversationId) => {
        const updatedConversation = await Conversation.findById(conversationId)
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'email role' }
            })
            .select('participants lastMessage lastMessageAt');

        if (!updatedConversation) return;

        updatedConversation.participants.forEach((participantId) => {
            io.to(String(participantId)).emit('conversation_updated', {
                conversationId: updatedConversation._id,
                lastMessage: updatedConversation.lastMessage,
                lastMessageAt: updatedConversation.lastMessageAt
            });
        });
    };

    const updateConversationLastMessage = async (conversationId) => {
        const latestMessage = await ChatMessage.findOne({ conversation: conversationId }).sort({ createdAt: -1 });

        if (latestMessage) {
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: latestMessage._id,
                lastMessageAt: latestMessage.createdAt
            });
            return;
        }

        await Conversation.findByIdAndUpdate(conversationId, {
            $unset: { lastMessage: 1 },
            lastMessageAt: null
        });
    };

    // Join user's personal room
    socket.join(socket.userId);

    // Handle joining conversation
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, receiverId, message, messageType = 'text', attachmentUrl } = data;

            // Create message
            const chatMessage = await ChatMessage.create({
                conversation: conversationId,
                sender: socket.userId,
                receiver: receiverId,
                message,
                messageType,
                attachmentUrl,
                isDelivered: true,
                deliveredAt: new Date()
            });

            // Update conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: chatMessage._id,
                lastMessageAt: new Date()
            });

            // Populate sender info
            await chatMessage.populate('sender', 'email role');

            // Emit to conversation room
            io.to(`conversation_${conversationId}`).emit('new_message', chatMessage);

            // Emit notification to receiver
            io.to(receiverId).emit('message_notification', {
                conversationId,
                message: chatMessage
            });

            // Emit confirmation to sender
            socket.emit('message_sent', chatMessage);
            await emitConversationUpdate(conversationId);
        } catch (error) {
            console.error('Message error:', error);
            socket.emit('message_error', { error: error.message });
        }
    });

    socket.on('edit_message', async (data = {}) => {
        try {
            const { conversationId, messageId, message } = data;
            const nextMessage = typeof message === 'string' ? message.trim() : '';

            if (!conversationId || !messageId || !nextMessage) {
                socket.emit('message_error', { error: 'Invalid edit payload' });
                return;
            }

            const hasAccess = await Conversation.exists({
                _id: conversationId,
                participants: socket.userId,
                isActive: true
            });

            if (!hasAccess) {
                socket.emit('message_error', { error: 'Not authorized to edit this message' });
                return;
            }

            const existingMessage = await ChatMessage.findOne({
                _id: messageId,
                conversation: conversationId
            });

            if (!existingMessage) {
                socket.emit('message_error', { error: 'Message not found' });
                return;
            }

            if (String(existingMessage.sender) !== String(socket.userId)) {
                socket.emit('message_error', { error: 'You can only edit your own messages' });
                return;
            }

            existingMessage.message = nextMessage;
            existingMessage.editedAt = new Date();
            await existingMessage.save();
            await existingMessage.populate('sender', 'email role');

            io.to(`conversation_${conversationId}`).emit('message_updated', existingMessage);
            await emitConversationUpdate(conversationId);
        } catch (error) {
            console.error('Edit message error:', error);
            socket.emit('message_error', { error: error.message });
        }
    });

    socket.on('delete_message', async (data = {}) => {
        try {
            const { conversationId, messageId } = data;

            if (!conversationId || !messageId) {
                socket.emit('message_error', { error: 'Invalid delete payload' });
                return;
            }

            const hasAccess = await Conversation.exists({
                _id: conversationId,
                participants: socket.userId,
                isActive: true
            });

            if (!hasAccess) {
                socket.emit('message_error', { error: 'Not authorized to delete this message' });
                return;
            }

            const existingMessage = await ChatMessage.findOne({
                _id: messageId,
                conversation: conversationId
            });

            if (!existingMessage) {
                socket.emit('message_error', { error: 'Message not found' });
                return;
            }

            if (String(existingMessage.sender) !== String(socket.userId)) {
                socket.emit('message_error', { error: 'You can only delete your own messages' });
                return;
            }

            await ChatMessage.deleteOne({ _id: messageId });
            await updateConversationLastMessage(conversationId);

            io.to(`conversation_${conversationId}`).emit('message_deleted', {
                conversationId,
                messageId
            });
            await emitConversationUpdate(conversationId);
        } catch (error) {
            console.error('Delete message error:', error);
            socket.emit('message_error', { error: error.message });
        }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        const { conversationId, receiverId } = data;
        socket.to(receiverId).emit('user_typing', {
            conversationId,
            userId: socket.userId
        });
    });

    socket.on('stop_typing', (data) => {
        const { conversationId, receiverId } = data;
        socket.to(receiverId).emit('user_stopped_typing', {
            conversationId,
            userId: socket.userId
        });
    });

    // Handle read receipts
    socket.on('mark_read', async (data) => {
        try {
            const { ChatMessage } = require('./models/ChatMessage');
            const { conversationId, senderId } = data;

            await ChatMessage.updateMany(
                {
                    conversation: conversationId,
                    sender: senderId,
                    receiver: socket.userId,
                    isRead: false
                },
                {
                    isRead: true,
                    readAt: new Date()
                }
            );

            io.to(senderId).emit('messages_read', { conversationId });
        } catch (error) {
            console.error('Mark read error:', error);
        }
    });

    // Handle notifications
    socket.on('subscribe_notifications', () => {
        socket.join('notifications');
    });

    socket.on('unsubscribe_notifications', () => {
        socket.leave('notifications');
    });

    // WebRTC signaling for one-to-one calls
    socket.on('video_call_invite', (data = {}) => {
        const { conversationId, receiverId, callType = 'video' } = data;
        if (!conversationId || !receiverId) return;

        io.to(receiverId).emit('video_call_invite', {
            conversationId,
            callerId: socket.userId,
            callType: callType === 'voice' ? 'voice' : 'video'
        });
    });

    socket.on('video_call_response', (data = {}) => {
        const { conversationId, receiverId, accepted, callType = 'video' } = data;
        if (!conversationId || !receiverId || typeof accepted !== 'boolean') return;

        io.to(receiverId).emit('video_call_response', {
            conversationId,
            responderId: socket.userId,
            accepted,
            callType: callType === 'voice' ? 'voice' : 'video'
        });
    });

    socket.on('video_call_offer', (data = {}) => {
        const { conversationId, receiverId, sdp, callType = 'video' } = data;
        if (!conversationId || !receiverId || !sdp) return;

        io.to(receiverId).emit('video_call_offer', {
            conversationId,
            senderId: socket.userId,
            sdp,
            callType: callType === 'voice' ? 'voice' : 'video'
        });
    });

    socket.on('video_call_answer', (data = {}) => {
        const { conversationId, receiverId, sdp, callType = 'video' } = data;
        if (!conversationId || !receiverId || !sdp) return;

        io.to(receiverId).emit('video_call_answer', {
            conversationId,
            senderId: socket.userId,
            sdp,
            callType: callType === 'voice' ? 'voice' : 'video'
        });
    });

    socket.on('video_call_ice_candidate', (data = {}) => {
        const { conversationId, receiverId, candidate } = data;
        if (!conversationId || !receiverId || !candidate) return;

        io.to(receiverId).emit('video_call_ice_candidate', {
            conversationId,
            senderId: socket.userId,
            candidate
        });
    });

    socket.on('video_call_end', (data = {}) => {
        const { conversationId, receiverId } = data;
        if (!conversationId || !receiverId) return;

        io.to(receiverId).emit('video_call_end', {
            conversationId,
            senderId: socket.userId
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
    });
});

// Utility function to send notification
app.set('sendNotification', (userId, notification) => {
    io.to(userId).emit('notification', notification);
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 CareerBridge Platform Server                            ║
║                                                              ║
║   Server running on port ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                              ║
║   API Endpoints:                                             ║
║   • Auth:       /api/auth                                    ║
║   • Students:   /api/students                               ║
║   • Alumni:     /api/alumni                                 ║
║   • Match:      /api/match                                   ║
║   • Mentorship: /api/mentorship                             ║
║   • Referral:   /api/referral                               ║
║   • Chat:       /api/chat                                    ║
║   • Admin:      /api/admin                                   ║
║                                                              ║
║   WebSocket: Enabled (Real-time chat & notifications)       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = { app, server, io };
