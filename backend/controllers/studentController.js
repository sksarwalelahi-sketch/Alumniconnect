const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Create/Update student profile
// @route   PUT /api/students/profile
// @access  Private (Student)
exports.createOrUpdateProfile = asyncHandler(async (req, res) => {
    const {
        name,
        profilePhoto,
        college,
        branch,
        graduationYear,
        skills,
        careerInterests,
        linkedInUrl,
        bio,
        targetCompanies,
        isOpenToMentorship
    } = req.body;

    let profile = await StudentProfile.findOne({ user: req.user._id });

    if (profile) {
        // Update existing profile
        profile.name = name || profile.name;
        profile.profilePhoto = profilePhoto || profile.profilePhoto;
        profile.college = college || profile.college;
        profile.branch = branch || profile.branch;
        profile.graduationYear = graduationYear || profile.graduationYear;
        profile.skills = skills || profile.skills;
        profile.careerInterests = careerInterests || profile.careerInterests;
        profile.linkedInUrl = linkedInUrl || profile.linkedInUrl;
        profile.bio = bio || profile.bio;
        profile.targetCompanies = targetCompanies || profile.targetCompanies;
        profile.isOpenToMentorship = isOpenToMentorship !== undefined ? isOpenToMentorship : profile.isOpenToMentorship;

        await profile.save();
    } else {
        // Create new profile
        profile = await StudentProfile.create({
            user: req.user._id,
            name,
            profilePhoto,
            college,
            branch,
            graduationYear,
            skills,
            careerInterests,
            linkedInUrl,
            bio,
            targetCompanies,
            isOpenToMentorship
        });
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private (Student)
exports.getProfile = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Get all students (for admin)
// @route   GET /api/students
// @access  Private (Admin)
exports.getAllStudents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, branch, year, search } = req.query;

    const query = {};

    if (branch) query.branch = branch;
    if (year) query.graduationYear = year;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } }
        ];
    }

    const students = await StudentProfile.find(query)
        .populate('user', 'email isActive lastLogin')
        .select('-notifications')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await StudentProfile.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            students,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private
exports.getStudentById = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findById(req.params.id)
        .populate('user', 'email isActive lastLogin');

    if (!profile) {
        throw new AppError('Student not found', 404);
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Upload resume
// @route   PUT /api/students/resume
// @access  Private (Student)
exports.uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a file', 400);
    }

    const profile = await StudentProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    profile.resumeUrl = req.file.path;
    await profile.save();

    res.status(200).json({
        success: true,
        data: {
            resumeUrl: profile.resumeUrl
        }
    });
});

// @desc    Upload profile photo
// @route   PUT /api/students/profile-photo
// @access  Private (Student)
exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a photo', 400);
    }

    const profile = await StudentProfile.findOne({ user: req.user._id });

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

// @desc    Get student public profile by ID
// @route   GET /api/students/public/:id
// @access  Private
exports.getPublicProfileById = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findById(req.params.id).select(
        'name profilePhoto college branch graduationYear skills careerInterests linkedInUrl bio'
    );

    if (!profile) {
        throw new AppError('Student not found', 404);
    }

    res.status(200).json({
        success: true,
        data: profile
    });
});

// @desc    Update notifications
// @route   PUT /api/students/notifications
// @access  Private (Student)
exports.updateNotifications = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ user: req.user._id });

    if (!profile) {
        throw new AppError('Profile not found', 404);
    }

    profile.notifications = req.body.notifications || profile.notifications;
    await profile.save();

    res.status(200).json({
        success: true,
        data: profile.notifications
    });
});

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private (Admin)
exports.getStudentStats = asyncHandler(async (req, res) => {
    const stats = await StudentProfile.aggregate([
        {
            $group: {
                _id: '$branch',
                count: { $sum: 1 }
            }
        }
    ]);

    const yearStats = await StudentProfile.aggregate([
        {
            $group: {
                _id: '$graduationYear',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            byBranch: stats,
            byYear: yearStats
        }
    });
});
