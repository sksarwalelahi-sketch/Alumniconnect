const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true,
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format']
    },
    endTime: {
        type: String,
        required: true,
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm format']
    },
    topic: {
        type: String,
        maxlength: [200, 'Topic cannot exceed 200 characters']
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    scheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const mentorshipRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    alumni: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentProfile',
        required: true
    },
    alumniProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AlumniProfile',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    message: {
        type: String,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    alumniResponse: {
        type: String,
        maxlength: [300, 'Response cannot exceed 300 characters']
    },
    goals: [{
        type: String,
        trim: true
    }],
    sessionSchedule: {
        type: [sessionSchema],
        default: []
    },
    chatEnabled: {
        type: Boolean,
        default: false
    },
    matchScore: {
        type: Number,
        default: 0
    },
    studentFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: [500, 'Feedback cannot exceed 500 characters']
        },
        givenAt: {
            type: Date
        }
    },
    alumniFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: [500, 'Feedback cannot exceed 500 characters']
        },
        givenAt: {
            type: Date
        }
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        maxlength: [200, 'Rejection reason cannot exceed 200 characters']
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
mentorshipRequestSchema.index({ student: 1, status: 1 });
mentorshipRequestSchema.index({ alumni: 1, status: 1 });
mentorshipRequestSchema.index({ status: 1 });
mentorshipRequestSchema.index({ createdAt: -1 });

// Virtual for session count
mentorshipRequestSchema.virtual('sessionCount').get(function () {
    return this.sessionSchedule ? this.sessionSchedule.length : 0;
});

// Pre-save middleware to update alumni mentee count
mentorshipRequestSchema.pre('save', async function (next) {
    if (this.isModified('status') && this.status === 'approved') {
        const AlumniProfile = require('./AlumniProfile');
        await AlumniProfile.findByIdAndUpdate(this.alumniProfile, {
            $inc: { currentMenteesCount: 1 }
        });
    }
    next();
});

// Method to update status
mentorshipRequestSchema.methods.updateStatus = async function (newStatus, reason = null) {
    this.status = newStatus;

    if (newStatus === 'approved') {
        this.startedAt = new Date();
        this.chatEnabled = true;
    } else if (newStatus === 'rejected') {
        this.rejectedAt = new Date();
        this.rejectionReason = reason;
    } else if (newStatus === 'completed') {
        this.completedAt = new Date();
    }

    await this.save();
    return this;
};

// Method to add session
mentorshipRequestSchema.methods.addSession = async function (sessionData) {
    this.sessionSchedule.push(sessionData);
    await this.save();
    return this;
};

// Static method to get pending requests for an alumni
mentorshipRequestSchema.statics.getPendingForAlumni = async function (alumniId) {
    return await this.find({ alumni: alumniId, status: 'pending' })
        .populate('student', 'email')
        .populate('studentProfile')
        .sort({ createdAt: -1 });
};

// Static method to get active mentorships for a user
mentorshipRequestSchema.statics.getActiveMentorships = async function (userId, role) {
    const field = role === 'student' ? 'student' : 'alumni';
    return await this.find({ [field]: userId, status: { $in: ['approved', 'pending'] } })
        .populate(role === 'student' ? 'alumni alumniProfile' : 'student studentProfile')
        .sort({ updatedAt: -1 });
};

module.exports = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
