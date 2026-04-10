const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
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
    college: {
        type: String,
        required: [true, 'College name is required'],
        trim: true
    },
    branch: {
        type: String,
        required: [true, 'Branch is required'],
        enum: [
            'Computer Science',
            'Information Technology',
            'Electronics',
            'Electrical',
            'Mechanical',
            'Civil',
            'Chemical',
            'Biotechnology',
            'Other'
        ]
    },
    graduationYear: {
        type: Number,
        required: [true, 'Graduation year is required'],
        min: [2000, 'Graduation year seems invalid'],
        max: [2030, 'Graduation year seems invalid']
    },
    skills: [{
        type: String,
        trim: true
    }],
    careerInterests: [{
        type: String,
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
            'Entrepreneurship',
            'Higher Studies',
            'Other'
        ]
    }],
    resumeUrl: {
        type: String
    },
    linkedInUrl: {
        type: String,
        match: [/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/, 'Please enter a valid LinkedIn URL']
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    targetCompanies: [{
        type: String,
        trim: true
    }],
    isOpenToMentorship: {
        type: Boolean,
        default: true
    },
    matchScore: {
        type: Number,
        default: 0
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

// Virtual for experience (students have 0 experience)
studentProfileSchema.virtual('experienceYears').get(function () {
    return 0;
});

// Indexes for efficient querying
studentProfileSchema.index({ branch: 1, graduationYear: 1 });
studentProfileSchema.index({ skills: 1 });
studentProfileSchema.index({ careerInterests: 1 });

// Static method to find matching alumni
studentProfileSchema.statics.findMatches = async function (studentId) {
    const StudentProfile = require('./StudentProfile');
    const AlumniProfile = require('./AlumniProfile');

    const student = await this.findOne({ user: studentId });
    if (!student) return [];

    const requireVerified = process.env.NODE_ENV === 'production';
    const query = { isAvailableForMentorship: true };
    if (requireVerified) query.isVerified = true;
    const alumni = await AlumniProfile.find(query);

    // AI Matching Algorithm
    const matches = alumni.map(alumni => {
        const matchScore = calculateMatchScore(student, alumni);
        return { alumni, matchScore };
    });

    // Sort by match score descending and return top 5
    return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5)
        .map(m => ({
            ...m.alumni.toObject(),
            matchScore: m.matchScore.toFixed(2)
        }));
};

// AI Matching Algorithm
function calculateMatchScore(student, alumni) {
    let score = 0;

    // Skill similarity (Jaccard Similarity) - 40% weight
    const studentSkills = new Set(student.skills.map(s => s.toLowerCase()));
    const alumniSkills = new Set(alumni.skills.map(s => s.toLowerCase()));
    const skillIntersection = new Set([...studentSkills].filter(x => alumniSkills.has(x)));
    const skillUnion = new Set([...studentSkills, ...alumniSkills]);
    const jaccardSimilarity = skillUnion.size === 0 ? 0 : skillIntersection.size / skillUnion.size;
    score += jaccardSimilarity * 40;

    // Domain match - 30% weight
    const studentInterests = student.careerInterests.map(i => i.toLowerCase());
    const alumniDomains = alumni.domains.map(d => d.toLowerCase());
    const domainMatches = studentInterests.filter(i =>
        alumniDomains.some(d => d.includes(i) || i.includes(d))
    ).length;
    const domainScore = studentInterests.length > 0
        ? (domainMatches / studentInterests.length) * 30
        : 0;
    score += domainScore;

    // Experience weight - 20% weight (more experienced mentors get higher score)
    const experienceScore = Math.min(alumni.experienceYears / 20, 1) * 20;
    score += experienceScore;

    // Availability bonus - 10% weight
    if (alumni.isAvailableForReferrals) score += 5;
    if (alumni.isAvailableForMentorship) score += 5;

    return Math.min(score, 100);
};

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
