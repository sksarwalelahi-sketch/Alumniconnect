const mongoose = require('mongoose');

const alumniProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    profilePhoto: {
        type: String
    },
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    designation: {
        type: String,
        required: [true, 'Designation is required'],
        trim: true
    },
    experienceYears: {
        type: Number,
        required: [true, 'Experience years is required'],
        min: [0, 'Experience cannot be negative'],
        max: [50, 'Experience seems invalid']
    },
    workExperience: [{
        company: {
            type: String,
            trim: true
        },
        designation: {
            type: String,
            trim: true
        },
        startYear: {
            type: Number,
            min: [1950, 'Start year seems invalid'],
            max: [2100, 'Start year seems invalid']
        },
        endYear: {
            type: Number,
            min: [1950, 'End year seems invalid'],
            max: [2100, 'End year seems invalid']
        },
        isCurrent: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters']
        }
    }],
    domains: [{
        type: String,
        required: [true, 'Domain is required'],
        enum: [
            'Software Development',
            'Data Science',
            'Machine Learning',
            'Web Development',
            'Mobile Development',
            'DevOps',
            'Cloud Computing',
            'Cybersecurity',
            'Product Management',
            'UI/UX Design',
            'Data Analysis',
            'Consulting',
            'Core Engineering',
            'Research',
            'Finance',
            'Marketing',
            'Sales',
            'Other'
        ]
    }],
    skills: [{
        type: String,
        trim: true
    }],
    isAvailableForReferrals: {
        type: Boolean,
        default: true
    },
    isAvailableForMentorship: {
        type: Boolean,
        default: true
    },
    mentorshipSlots: {
        type: [{
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            },
            startTime: {
                type: String,
                match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
            },
            endTime: {
                type: String,
                match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
            }
        }],
        default: []
    },
    maxMentees: {
        type: Number,
        default: 5,
        min: [1, 'Maximum mentees must be at least 1'],
        max: [20, 'Maximum mentees cannot exceed 20']
    },
    currentMenteesCount: {
        type: Number,
        default: 0
    },
    linkedInUrl: {
        type: String,
        match: [/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/, 'Please enter a valid LinkedIn URL']
    },
    twitterUrl: {
        type: String
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    companiesCanRefer: [{
        type: String,
        trim: true
    }],
    referralCriteria: {
        type: String,
        maxlength: [300, 'Referral criteria cannot exceed 300 characters']
    },
    achievements: [{
        title: String,
        description: String,
        year: Number
    }],
    testimonial: {
        type: String,
        maxlength: [500, 'Testimonial cannot exceed 500 characters']
    },
    mediaPosts: [{
        url: { type: String, required: true },
        caption: { type: String },
        mediaType: { type: String, enum: ['image', 'video', 'other'], default: 'image' },
        createdAt: { type: Date, default: Date.now }
    }],
    verificationDocuments: [{
        type: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    notifications: [{
        type: {
            type: String,
            enum: ['mentorship', 'referral', 'message', 'system'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for current mentees
alumniProfileSchema.virtual('availableSlots').get(function () {
    return this.maxMentees - this.currentMenteesCount;
});

// Indexes
alumniProfileSchema.index({ domains: 1 });
alumniProfileSchema.index({ skills: 1 });
alumniProfileSchema.index({ isAvailableForMentorship: 1, isAvailableForReferrals: 1 });
alumniProfileSchema.index({ experienceYears: -1 });

// Pre-save middleware to check mentees count
alumniProfileSchema.pre('save', function (next) {
    if (this.currentMenteesCount > this.maxMentees) {
        this.currentMenteesCount = this.maxMentees;
    }
    next();
});

// Method to check availability
alumniProfileSchema.methods.hasAvailability = function () {
    return this.isAvailableForMentorship &&
        this.currentMenteesCount < this.maxMentees;
};

// Method to add rating
alumniProfileSchema.methods.addRating = function (score) {
    const newCount = this.rating.count + 1;
    const newAverage = ((this.rating.average * this.rating.count) + score) / newCount;
    this.rating = {
        average: Math.round(newAverage * 10) / 10,
        count: newCount
    };
};

module.exports = mongoose.model('AlumniProfile', alumniProfileSchema);
