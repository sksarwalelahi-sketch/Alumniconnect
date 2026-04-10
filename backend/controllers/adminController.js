const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const ReferralRequest = require('../models/ReferralRequest');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboard = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalStudents,
        totalAlumni,
        verifiedAlumni,
        pendingAlumni,
        totalMentorships,
        activeMentorships,
        totalReferrals,
        activeReferrals
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'alumni' }),
        AlumniProfile.countDocuments({ isVerified: true }),
        AlumniProfile.countDocuments({ isVerified: false }),
        MentorshipRequest.countDocuments(),
        MentorshipRequest.countDocuments({ status: 'approved' }),
        ReferralRequest.countDocuments(),
        ReferralRequest.countDocuments({ status: { $in: ['requested', 'under_review'] } })
    ]);

    // Get recent activity
    const recentUsers = await User.find()
        .select('email role lastLogin createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

    // Get mentorship status distribution
    const mentorshipStats = await MentorshipRequest.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Get referral status distribution
    const referralStats = await ReferralRequest.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Get users by month (last 12 months)
    const usersByMonth = await User.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
                }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            overview: {
                totalUsers,
                totalStudents,
                totalAlumni,
                verifiedAlumni,
                pendingAlumni,
                totalMentorships,
                activeMentorships,
                totalReferrals,
                activeReferrals
            },
            recentUsers,
            mentorshipStats,
            referralStats,
            usersByMonth
        }
    });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get all student profiles
// @route   GET /api/admin/students
// @access  Private (Admin)
exports.getAllStudentProfiles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } }
        ];
    }

    const [profiles, total] = await Promise.all([
        StudentProfile.find(query)
            .populate('user', 'email role isActive isVerified lastLogin createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        StudentProfile.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: {
            profiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get all alumni profiles
// @route   GET /api/admin/alumni
// @access  Private (Admin)
exports.getAllAlumniProfiles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, isVerified } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { designation: { $regex: search, $options: 'i' } }
        ];
    }
    if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true';
    }

    const [profiles, total] = await Promise.all([
        AlumniProfile.find(query)
            .populate('user', 'email role isActive isVerified lastLogin createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        AlumniProfile.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: {
            profiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    let profile = null;
    if (user.role === 'student') {
        profile = await StudentProfile.findOne({ user: user._id });
    } else if (user.role === 'alumni') {
        profile = await AlumniProfile.findOne({ user: user._id });
    }

    res.status(200).json({
        success: true,
        data: {
            user,
            profile
        }
    });
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    ).select('-password');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Verify alumni
// @route   PUT /api/admin/alumni/:id/verify
// @access  Private (Admin)
exports.verifyAlumni = asyncHandler(async (req, res) => {
    const { verified } = req.body;

    const alumniProfile = await AlumniProfile.findById(req.params.id);

    if (!alumniProfile) {
        throw new AppError('Alumni profile not found', 404);
    }

    alumniProfile.isVerified = verified;
    alumniProfile.verifiedBy = req.user._id;
    alumniProfile.verifiedAt = new Date();
    await alumniProfile.save();

    // Update user verification status
    await User.findByIdAndUpdate(alumniProfile.user, {
        isVerified: verified
    });

    res.status(200).json({
        success: true,
        data: alumniProfile
    });
});

// @desc    Get pending verifications
// @route   GET /api/admin/pending-verifications
// @access  Private (Admin)
exports.getPendingVerifications = asyncHandler(async (req, res) => {
    const pendingAlumni = await AlumniProfile.find({ isVerified: false })
        .populate('user', 'email createdAt')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: pendingAlumni
    });
});

// @desc    Get all mentorship requests (admin)
// @route   GET /api/admin/mentorships
// @access  Private (Admin)
exports.getAllMentorships = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const requests = await MentorshipRequest.find(query)
        .populate('student', 'email')
        .populate('alumni', 'email')
        .populate('studentProfile', 'name')
        .populate('alumniProfile', 'name company')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await MentorshipRequest.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get all referral requests (admin)
// @route   GET /api/admin/referrals
// @access  Private (Admin)
exports.getAllReferrals = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const requests = await ReferralRequest.find(query)
        .populate('student', 'email')
        .populate('alumni', 'email')
        .populate('studentProfile', 'name')
        .populate('alumniProfile', 'name company')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await ReferralRequest.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
exports.getAnalytics = asyncHandler(async (req, res) => {
    // User growth
    const userGrowth = await User.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    role: '$role'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Mentorship completion rate
    const mentorshipStats = await MentorshipRequest.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalMentorships = mentorshipStats.reduce((sum, s) => sum + s.count, 0);
    const completedMentorships = mentorshipStats.find(s => s._id === 'completed')?.count || 0;
    const completionRate = totalMentorships > 0
        ? ((completedMentorships / totalMentorships) * 100).toFixed(2)
        : 0;

    // Top companies for referrals
    const topCompanies = await ReferralRequest.aggregate([
        { $match: { status: 'referred' } },
        {
            $group: {
                _id: '$targetCompany',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // Most active alumni
    const activeAlumni = await MentorshipRequest.aggregate([
        { $match: { status: 'approved' } },
        {
            $group: {
                _id: '$alumni',
                activeMentees: { $sum: 1 }
            }
        },
        { $sort: { activeMentees: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'alumniprofiles',
                localField: '_id',
                foreignField: 'user',
                as: 'profile'
            }
        },
        {
            $project: {
                alumniId: '$_id',
                activeMentees: 1,
                name: { $arrayElemAt: ['$profile.name', 0] },
                company: { $arrayElemAt: ['$profile.company', 0] }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            userGrowth,
            mentorshipStats,
            completionRate,
            topCompanies,
            activeAlumni
        }
    });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Delete associated profile
    if (user.role === 'student') {
        await StudentProfile.deleteOne({ user: user._id });
    } else if (user.role === 'alumni') {
        await AlumniProfile.deleteOne({ user: user._id });
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});
