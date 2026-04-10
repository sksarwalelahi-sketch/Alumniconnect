const { ChatMessage, Conversation } = require('../models/ChatMessage');
const MentorshipRequest = require('../models/MentorshipRequest');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get conversations
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({
        participants: req.user._id,
        isActive: true
    })
        .populate('participants', 'email role')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
            const unreadCount = await ChatMessage.countDocuments({
                conversation: conv._id,
                receiver: req.user._id,
                isRead: false
            });

            const convObj = conv.toObject();
            convObj.unreadCount = unreadCount;

            // Get other participant info
            const otherParticipant = conv.participants.find(
                p => p._id.toString() !== req.user._id.toString()
            );
            if (otherParticipant) {
                let name = null;
                let profilePhoto = null;
                let profileId = null;
                if (otherParticipant.role === 'student') {
                    const profile = await StudentProfile.findOne({ user: otherParticipant._id }).select('_id name profilePhoto');
                    name = profile?.name || null;
                    profilePhoto = profile?.profilePhoto || null;
                    profileId = profile?._id || null;
                } else if (otherParticipant.role === 'alumni') {
                    const profile = await AlumniProfile.findOne({ user: otherParticipant._id }).select('_id name profilePhoto');
                    name = profile?.name || null;
                    profilePhoto = profile?.profilePhoto || null;
                    profileId = profile?._id || null;
                }
                convObj.otherParticipant = {
                    ...otherParticipant.toObject(),
                    name: name || otherParticipant.email,
                    profilePhoto,
                    profileId
                };
            }

            return convObj;
        })
    );

    const total = await Conversation.countDocuments({
        participants: req.user._id,
        isActive: true
    });

    res.status(200).json({
        success: true,
        data: {
            conversations: conversationsWithUnread,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get messages in a conversation
// @route   GET /api/chat/messages/:conversationId
// @access  Private
exports.getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        throw new AppError('Conversation not found', 404);
    }

    // Check if user is participant
    if (!conversation.participants.includes(req.user._id)) {
        throw new AppError('Not authorized', 403);
    }

    const messages = await ChatMessage.find({ conversation: conversationId })
        .populate('sender', 'email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Mark messages as read
    await ChatMessage.updateMany(
        {
            conversation: conversationId,
            receiver: req.user._id,
            isRead: false
        },
        {
            isRead: true,
            readAt: new Date()
        }
    );

    const total = await ChatMessage.countDocuments({ conversation: conversationId });

    res.status(200).json({
        success: true,
        data: {
            messages: messages.reverse(),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
    const { receiverId, message, messageType = 'text', attachmentUrl } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        throw new AppError('Receiver not found', 404);
    }

    // Check if they have an approved mentorship
    const mentorship = await MentorshipRequest.findOne({
        $or: [
            { student: req.user._id, alumni: receiverId },
            { student: receiverId, alumni: req.user._id }
        ],
        status: 'approved',
        chatEnabled: true
    });

    if (!mentorship) {
        throw new AppError('You can only chat with approved mentors/mentees', 403);
    }

    // Get or create conversation
    let conversation = await Conversation.getOrCreateConversation(
        req.user._id,
        receiverId,
        mentorship._id
    );

    // Create message
    const chatMessage = await ChatMessage.create({
        conversation: conversation._id,
        sender: req.user._id,
        receiver: receiverId,
        message,
        messageType,
        attachmentUrl,
        isDelivered: true,
        deliveredAt: new Date()
    });

    // Update conversation
    await conversation.updateLastMessage(chatMessage._id);

    await chatMessage.populate('sender', 'email role');

    res.status(201).json({
        success: true,
        data: chatMessage
    });
});

// @desc    Get or create conversation
// @route   POST /api/chat/conversation
// @access  Private
exports.getOrCreateConversation = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Check if they have an approved mentorship
    const mentorship = await MentorshipRequest.findOne({
        $or: [
            { student: req.user._id, alumni: userId },
            { student: userId, alumni: req.user._id }
        ],
        status: 'approved',
        chatEnabled: true
    });

    if (!mentorship) {
        throw new AppError('No approved mentorship relationship found', 403);
    }

    // Get or create conversation
    const conversation = await Conversation.getOrCreateConversation(
        req.user._id,
        userId,
        mentorship._id
    );

    await conversation.populate('participants', 'email role');

    const otherParticipant = conversation.participants.find(
        p => p._id.toString() !== req.user._id.toString()
    );
    let otherParticipantName = null;
    let otherParticipantPhoto = null;
    let otherParticipantProfileId = null;
    if (otherParticipant?.role === 'student') {
        const profile = await StudentProfile.findOne({ user: otherParticipant._id }).select('_id name profilePhoto');
        otherParticipantName = profile?.name || null;
        otherParticipantPhoto = profile?.profilePhoto || null;
        otherParticipantProfileId = profile?._id || null;
    } else if (otherParticipant?.role === 'alumni') {
        const profile = await AlumniProfile.findOne({ user: otherParticipant._id }).select('_id name profilePhoto');
        otherParticipantName = profile?.name || null;
        otherParticipantPhoto = profile?.profilePhoto || null;
        otherParticipantProfileId = profile?._id || null;
    }

    res.status(200).json({
        success: true,
        data: {
            ...conversation.toObject(),
            otherParticipant: otherParticipant
                ? {
                    ...otherParticipant.toObject(),
                    name: otherParticipantName || otherParticipant.email,
                    profilePhoto: otherParticipantPhoto,
                    profileId: otherParticipantProfileId
                }
                : null
        }
    });
});

// @desc    Upload chat attachment
// @route   POST /api/chat/upload
// @access  Private
exports.uploadAttachment = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
        success: true,
        data: {
            url: fileUrl,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype
        }
    });
});

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const count = await ChatMessage.countDocuments({
        receiver: req.user._id,
        isRead: false
    });

    res.status(200).json({
        success: true,
        data: { unreadCount: count }
    });
});

// @desc    Delete conversation
// @route   DELETE /api/chat/conversation/:id
// @access  Private
exports.deleteConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
        throw new AppError('Conversation not found', 404);
    }

    if (!conversation.participants.includes(req.user._id)) {
        throw new AppError('Not authorized', 403);
    }

    // Soft delete - just mark as inactive
    conversation.isActive = false;
    await conversation.save();

    // Delete all messages
    await ChatMessage.deleteMany({ conversation: conversation._id });

    res.status(200).json({
        success: true,
        message: 'Conversation deleted'
    });
});

// Socket.io event handlers
exports.handleSocketConnection = (socket) => {
    const userId = socket.userId;

    // Join user's room
    socket.join(userId);

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
        const { conversationId, receiverId, message } = data;

        try {
            const chatMessage = await ChatMessage.create({
                conversation: conversationId,
                sender: userId,
                receiver: receiverId,
                message,
                isDelivered: true,
                deliveredAt: new Date()
            });

            // Update conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: chatMessage._id,
                lastMessageAt: new Date()
            });

            // Emit to conversation room
            socket.to(`conversation_${conversationId}`).emit('new_message', chatMessage);

            // Emit to receiver's personal room
            socket.to(receiverId).emit('message_notification', {
                conversationId,
                message: chatMessage
            });

            // Emit back to sender
            socket.emit('message_sent', chatMessage);
        } catch (error) {
            socket.emit('message_error', { error: error.message });
        }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        const { conversationId, receiverId } = data;
        socket.to(receiverId).emit('user_typing', { conversationId });
    });

    socket.on('stop_typing', (data) => {
        const { conversationId, receiverId } = data;
        socket.to(receiverId).emit('user_stopped_typing', { conversationId });
    });

    // Handle message read
    socket.on('mark_read', async (data) => {
        const { conversationId, senderId } = data;

        await ChatMessage.updateMany(
            {
                conversation: conversationId,
                sender: senderId,
                receiver: userId,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        socket.to(senderId).emit('messages_read', { conversationId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
    });
};
