const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: [true, 'Message content is required'],
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
    },
    attachmentUrl: {
        type: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    editedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
chatMessageSchema.index({ conversation: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ receiver: 1, isRead: 1 });
chatMessageSchema.index({ conversation: 1, isRead: 1, receiver: 1 });

// Conversation model
const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    mentorshipRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MentorshipRequest'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for conversations
conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ mentorshipRequest: 1 });

// Method to get unread count for a user
chatMessageSchema.statics.getUnreadCount = async function (conversationId, userId) {
    return await this.countDocuments({
        conversation: conversationId,
        receiver: userId,
        isRead: false
    });
};

// Method to mark messages as read
chatMessageSchema.statics.markAsRead = async function (conversationId, userId) {
    await this.updateMany(
        {
            conversation: conversationId,
            receiver: userId,
            isRead: false
        },
        {
            isRead: true,
            readAt: new Date()
        }
    );
};

// Static method to get or create conversation
conversationSchema.statics.getOrCreateConversation = async function (user1Id, user2Id, mentorshipRequestId = null) {
    let conversation = await this.findOne({
        participants: { $all: [user1Id, user2Id] },
        isActive: true
    });

    if (!conversation) {
        conversation = await this.create({
            participants: [user1Id, user2Id],
            mentorshipRequest: mentorshipRequestId
        });
    }

    return conversation;
};

// Method to update last message
conversationSchema.methods.updateLastMessage = async function (messageId) {
    this.lastMessage = messageId;
    this.lastMessageAt = new Date();
    await this.save();
};

// Virtual for unread count
conversationSchema.virtual('unreadCount').get(function () {
    return 0; // Will be populated separately
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { ChatMessage, Conversation };
