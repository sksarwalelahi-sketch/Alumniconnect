const mongoose = require('mongoose');

const referralRequestSchema = new mongoose.Schema({
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
        enum: ['requested', 'under_review', 'referred', 'rejected', 'withdrawn'],
        default: 'requested'
    },
    targetCompany: {
        type: String,
        required: [true, 'Target company is required'],
        trim: true
    },
    targetRole: {
        type: String,
        required: [true, 'Target role is required'],
        trim: true
    },
    message: {
        type: String,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    resumeUrl: {
        type: String
    },
    linkedInUrl: {
        type: String
    },
    alumniResponse: {
        type: String,
        maxlength: [300, 'Response cannot exceed 300 characters']
    },
    referralStatus: {
        hasReferred: {
            type: Boolean,
            default: false
        },
        referredAt: {
            type: Date
        },
        referralLink: {
            type: String
        }
    },
    followUpDate: {
        type: Date
    },
    rejectionReason: {
        type: String,
        maxlength: [200, 'Rejection reason cannot exceed 200 characters']
    },
    withdrawnReason: {
        type: String,
        maxlength: [200, 'Withdrawal reason cannot exceed 200 characters']
    },
    timeline: [{
        status: {
            type: String,
            enum: ['requested', 'under_review', 'referred', 'rejected', 'withdrawn']
        },
        description: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    notifications: [{
        message: String,
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes
referralRequestSchema.index({ student: 1, status: 1 });
referralRequestSchema.index({ alumni: 1, status: 1 });
referralRequestSchema.index({ status: 1, targetCompany: 1 });
referralRequestSchema.index({ createdAt: -1 });

// Add timeline entry on status change
referralRequestSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        const statusDescriptions = {
            'requested': 'Referral request sent',
            'under_review': 'Request is under review by alumni',
            'referred': 'Referral has been submitted',
            'rejected': 'Request has been rejected',
            'withdrawn': 'Request has been withdrawn'
        };

        this.timeline.push({
            status: this.status,
            description: statusDescriptions[this.status] || `Status changed to ${this.status}`
        });
    }
    next();
});

// Method to update status
referralRequestSchema.methods.updateStatus = async function (newStatus, details = {}) {
    const oldStatus = this.status;
    this.status = newStatus;

    if (newStatus === 'referred') {
        this.referralStatus.hasReferred = true;
        this.referralStatus.referredAt = new Date();
        if (details.referralLink) {
            this.referralStatus.referralLink = details.referralLink;
        }
    } else if (newStatus === 'rejected') {
        this.rejectionReason = details.reason || '';
    } else if (newStatus === 'withdrawn') {
        this.withdrawnReason = details.reason || '';
    }

    await this.save();
    return this;
};

// Method to add notification
referralRequestSchema.methods.addNotification = async function (message) {
    this.notifications.push({ message, read: false });
    await this.save();
};

// Static method to get pending requests for alumni
referralRequestSchema.statics.getPendingForAlumni = async function (alumniId) {
    return await this.find({
        alumni: alumniId,
        status: { $in: ['requested', 'under_review'] }
    })
        .populate('student', 'email')
        .populate('studentProfile')
        .sort({ createdAt: -1 });
};

// Static method to get active referrals for a student
referralRequestSchema.statics.getActiveForStudent = async function (studentId) {
    return await this.find({
        student: studentId,
        status: { $nin: ['rejected', 'withdrawn'] }
    })
        .populate('alumni', 'email')
        .populate('alumniProfile')
        .sort({ updatedAt: -1 });
};

module.exports = mongoose.model('ReferralRequest', referralRequestSchema);
