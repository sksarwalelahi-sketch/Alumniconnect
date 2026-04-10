const AlumniProfile = require('../models/AlumniProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Create/Update alumni profile
// @route   PUT /api/alumni/profile
// @access  Private (Alumni)
exports.createOrUpdateProfile = asyncHandler(async (req, res) => {
    const {
        name,
        profilePhoto,
        company,
        designation,
        experienceYears,
        workExperience,
        domains,
        skills,
        isAvailableForReferrals,
        isAvailableForMentorship,
        mentorshipSlots,
        maxMentees,
        linkedInUrl,
        twitterUrl,
        bio,
        companiesCanRefer,
        referralCriteria,
        achievements
    } = req.body;

    let profile = await AlumniProfile.findOne({ user: req.user._id });

    if (profile) {
        // Update existing profile
        profile.name = name || profile.name;
        profile.profilePhoto = profilePhoto || profile.profilePhoto;
        profile.company = company || profile.company;
        profile.designation = designation || profile.designation;
        profile.experienceYears = experienceYears || profile.experienceYears;
        profile.workExperience = workExperience || profile.workExperience;
        profile.domains = domains || profile.domains;
        profile.skills = skills || profile.skills;
        profile.isAvailableForReferrals = isAvailableForReferrals !== undefined ? isAvailableForReferrals : profile.isAvailableForReferrals;
        profile.isAvailableForMentorship = isAvailableForMentorship !== undefined ? isAvailableForMentorship : profile.isAvailableForMentorship;
        profile.mentorshipSlots = mentorshipSlots || profile.mentorshipSlots;
        profile.maxMentees = maxMentees || profile.maxMentees;
        profile.linkedInUrl = linkedInUrl || profile.linkedInUrl;
        profile.twitterUrl = twitterUrl || profile.twitterUrl;
        profile.bio = bio || profile.bio;
        profile.companiesCanRefer = companiesCanRefer || profile.companiesCanRefer;
        profile.referralCriteria = referralCriteria || profile.referralCriteria;
        profile.achievements = achievements || profile.achievements;

        await profile.save();
    } else {
        // Create new profile
        profile = await AlumniProfile.create({
            user: req.user._id,
            name,
            profilePhoto,
            company,
            designation,
            experienceYears,
            workExperience,
            domains,
            skills,
            isAvailableForReferrals,
            isAvailableForMentorship,
            mentorshipSlots,
            maxMentees,
            linkedInUrl,
            twitterUrl,
            bio,
            companiesCanRefer,
            referralCriteria,
            achievements,
            isVerified: false
        });
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Get alumni profile
// @route   GET /api/alumni/profile
// @access  Private (Alumni)
exports.getProfile = asyncHandler(async (req, res) => {
    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Public
exports.getAllAlumni = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        domain,
        company,
        skills,
        availableForMentorship,
        availableForReferral,
        search,
        sortBy = 'experienceYears',
        sortOrder = 'desc'
    } = req.query;

    const requireVerified = process.env.NODE_ENV === 'production';
    const query = {};
    if (requireVerified) query.isVerified = true;

    if (domain) query.domains = { $in: [domain] };
    if (company) query.company = { $regex: company, $options: 'i' };
    if (skills) query.skills = { $in: skills.split(',') };
    if (availableForMentorship === 'true') query.isAvailableForMentorship = true;
    if (availableForReferral === 'true') query.isAvailableForReferrals = true;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { designation: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const alumni = await AlumniProfile.find(query)
        .populate('user', 'email lastLogin isActive')
        .select('-notifications -achievements')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await AlumniProfile.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            alumni: alumni.filter(a => a.user?.isActive !== false),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get alumni by ID
// @route   GET /api/alumni/:id
// @access  Public
exports.getAlumniById = asyncHandler(async (req, res) => {
    const profile = await AlumniProfile.findById(req.params.id)
        .populate('user', 'email lastLogin');

    if (!profile) {
        throw new AppError('Alumni not found', 404);
    }

    const feedbacks = await MentorshipRequest.find({
        alumniProfile: profile._id,
        'studentFeedback.rating': { $exists: true }
    })
        .populate('studentProfile', 'name profilePhoto')
        .select('studentFeedback studentProfile createdAt')
        .sort({ 'studentFeedback.givenAt': -1, createdAt: -1 })
        .limit(20);

    const feedbackList = feedbacks.map((f) => ({
        rating: f.studentFeedback?.rating,
        comment: f.studentFeedback?.comment || '',
        givenAt: f.studentFeedback?.givenAt || f.createdAt,
        student: {
            name: f.studentProfile?.name || 'Student',
            profilePhoto: f.studentProfile?.profilePhoto || ''
        }
    }));

    res.status(200).json({
        success: true,
        data: {
            ...profile.toObject(),
            feedbacks: feedbackList
        }
    });
});

// @desc    Update mentorship slots
// @route   PUT /api/alumni/mentorship-slots
// @access  Private (Alumni)
exports.updateMentorshipSlots = asyncHandler(async (req, res) => {
    const { slots } = req.body;

    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    profile.mentorshipSlots = slots;
    await profile.save();

    res.status(200).json({
        success: true,
        data: profile.mentorshipSlots
    });
});

// @desc    Toggle availability
// @route   PUT /api/alumni/availability
// @access  Private (Alumni)
exports.toggleAvailability = asyncHandler(async (req, res) => {
    const { type, value } = req.body; // type: 'mentorship' or 'referral'

    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    if (type === 'mentorship') {
        profile.isAvailableForMentorship = value;
    } else if (type === 'referral') {
        profile.isAvailableForReferrals = value;
    }

    await profile.save();

    res.status(200).json({
        success: true,
        data: {
            isAvailableForMentorship: profile.isAvailableForMentorship,
            isAvailableForReferrals: profile.isAvailableForReferrals
        }
    });
});

// @desc    Get alumni statistics
// @route   GET /api/alumni/stats
// @access  Private (Admin)
exports.getAlumniStats = asyncHandler(async (req, res) => {
    const stats = await AlumniProfile.aggregate([
        {
            $group: {
                _id: '$domains',
                count: { $sum: 1 },
                avgExperience: { $avg: '$experienceYears' }
            }
        }
    ]);

    const companyStats = await AlumniProfile.aggregate([
        {
            $group: {
                _id: '$company',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    const totalAvailable = await AlumniProfile.countDocuments({
        isAvailableForMentorship: true
    });

    res.status(200).json({
        success: true,
        data: {
            byDomain: stats,
            topCompanies: companyStats,
            totalAvailableForMentorship: totalAvailable
        }
    });
});

// @desc    Add achievement
// @route   POST /api/alumni/achievements
// @access  Private (Alumni)
exports.addAchievement = asyncHandler(async (req, res) => {
    const { title, description, year } = req.body;

    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    profile.achievements.push({ title, description, year });
    await profile.save();

    res.status(201).json({
        success: true,
        data: profile.achievements
    });
});

// @desc    Upload profile photo
// @route   PUT /api/alumni/profile-photo
// @access  Private (Alumni)
exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a photo', 400);
    }

    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    profile.profilePhoto = `/uploads/${req.file.filename}`;
    await profile.save();

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Add media post (image/video) to alumni profile
// @route   POST /api/alumni/media
// @access  Private (Alumni)
exports.addMediaPost = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a media file', 400);
    }

    const { caption } = req.body;

    const profile = await AlumniProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    // Determine media type by mimetype
    const mimetype = req.file.mimetype || '';
    let mediaType = 'other';
    if (mimetype.startsWith('image/')) mediaType = 'image';
    else if (mimetype.startsWith('video/')) mediaType = 'video';

    profile.mediaPosts.unshift({ url: fileUrl, caption: caption || '', mediaType });
    // Keep recent 50 posts
    if (profile.mediaPosts.length > 50) profile.mediaPosts = profile.mediaPosts.slice(0, 50);

    await profile.save();

    res.status(201).json({
        success: true,
        data: profile.mediaPosts
    });
});
