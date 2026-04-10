const ReferralRequest = require('../models/ReferralRequest');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Send referral request
// @route   POST /api/referral/request
// @access  Private (Student)
exports.sendRequest = asyncHandler(async (req, res) => {
    const { alumniId, targetCompany, targetRole, message, resumeUrl, linkedInUrl } = req.body;

    // Support both alumni user ID and alumni profile ID
    let alumniProfile = await AlumniProfile.findById(alumniId);
    if (!alumniProfile) {
        alumniProfile = await AlumniProfile.findOne({ user: alumniId });
    }
    if (!alumniProfile) {
        throw new AppError('Alumni not found', 404);
    }

    const alumniUserId = alumniProfile.user;
    const alumniUser = await User.findById(alumniUserId);
    if (!alumniUser || alumniUser.role !== 'alumni') {
        throw new AppError('Alumni not found', 404);
    }

    if (!alumniUser.isActive) {
        throw new AppError('Alumni account is inactive', 400);
    }

    if (!alumniProfile.isAvailableForReferrals) {
        throw new AppError('Alumni is not available for referrals', 400);
    }

    // Check for existing request
    const existingRequest = await ReferralRequest.findOne({
        student: req.user._id,
        alumni: alumniUserId,
        targetCompany,
        status: { $nin: ['rejected', 'withdrawn'] }
    });

    if (existingRequest) {
        throw new AppError('You already have a referral request for this company', 400);
    }

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    if (!studentProfile) {
        throw new AppError('Please complete your profile first', 400);
    }

    if (!studentProfile.resumeUrl && !resumeUrl) {
        throw new AppError('Please upload your resume first', 400);
    }

    // Create request
    const request = await ReferralRequest.create({
        student: req.user._id,
        alumni: alumniUserId,
        studentProfile: studentProfile._id,
        alumniProfile: alumniProfile._id,
        targetCompany,
        targetRole,
        message,
        resumeUrl: resumeUrl || studentProfile.resumeUrl,
        linkedInUrl: linkedInUrl || studentProfile.linkedInUrl
    });

    await request.populate([
        { path: 'student', select: 'email' },
        { path: 'studentProfile', select: 'name profilePhoto college branch graduationYear skills' },
        { path: 'alumni', select: 'email' },
        { path: 'alumniProfile', select: 'name profilePhoto company designation' }
    ]);

    res.status(201).json({
        success: true,
        data: request
    });
});

// @desc    Get referral requests
// @route   GET /api/referral/requests
// @access  Private
exports.getRequests = asyncHandler(async (req, res) => {
    const { status, type = 'all', page = 1, limit = 20 } = req.query;

    let query = {};

    if (req.user.role === 'student') {
        query.student = req.user._id;
    } else if (req.user.role === 'alumni') {
        query.alumni = req.user._id;
    }

    if (status) {
        query.status = status;
    }

    if (type === 'sent' && req.user.role === 'student') {
        query.student = req.user._id;
    } else if (type === 'received' && req.user.role === 'alumni') {
        query.alumni = req.user._id;
    }

    const requests = await ReferralRequest.find(query)
        .populate('student', 'email')
        .populate('alumni', 'email')
        .populate('studentProfile', 'name profilePhoto college branch graduationYear skills')
        .populate('alumniProfile', 'name profilePhoto company designation')
        .sort({ updatedAt: -1 })
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

// @desc    Get pending referral requests (for alumni)
// @route   GET /api/referral/pending
// @access  Private (Alumni)
exports.getPendingRequests = asyncHandler(async (req, res) => {
    const requests = await ReferralRequest.find({
        alumni: req.user._id,
        status: { $in: ['requested', 'under_review'] }
    })
        .populate('student', 'email')
        .populate('studentProfile', 'name profilePhoto college branch graduationYear skills linkedInUrl resumeUrl')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: requests
    });
});

// @desc    Update referral request status
// @route   PUT /api/referral/:id
// @access  Private (Alumni)
exports.updateRequest = asyncHandler(async (req, res) => {
    const { status, response, referralLink } = req.body;

    const request = await ReferralRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.alumni.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized to update this request', 403);
    }

    // Update status
    const updateData = {};
    if (status) {
        request.status = status;
        if (status === 'referred') {
            request.referralStatus.hasReferred = true;
            request.referralStatus.referredAt = new Date();
            if (referralLink) {
                request.referralStatus.referralLink = referralLink;
            }
        } else if (status === 'rejected') {
            request.rejectionReason = response || '';
        }
    }

    if (response) {
        request.alumniResponse = response;
    }

    await request.save();

    // Add notification to student
    const studentProfile = await StudentProfile.findOne({ user: request.student });
    if (studentProfile) {
        studentProfile.notifications.push({
            type: 'referral',
            message: `Your referral request for ${request.targetCompany} has been ${status}`,
            read: false
        });
        await studentProfile.save();
    }

    await request.populate([
        { path: 'student', select: 'email' },
        { path: 'studentProfile' },
        { path: 'alumni', select: 'email' },
        { path: 'alumniProfile' }
    ]);

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Start review
// @route   PUT /api/referral/:id/review
// @access  Private (Alumni)
exports.startReview = asyncHandler(async (req, res) => {
    const request = await ReferralRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.alumni.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized', 403);
    }

    if (request.status !== 'requested') {
        throw new AppError('Request is not in requested status', 400);
    }

    request.status = 'under_review';
    await request.save();

    // Add notification
    const studentProfile = await StudentProfile.findOne({ user: request.student });
    if (studentProfile) {
        studentProfile.notifications.push({
            type: 'referral',
            message: `${request.alumniProfile?.name || 'An alumni'} is reviewing your referral request`,
            read: false
        });
        await studentProfile.save();
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Submit referral
// @route   PUT /api/referral/:id/submit
// @access  Private (Alumni)
exports.submitReferral = asyncHandler(async (req, res) => {
    const { referralLink } = req.body;

    const request = await ReferralRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.alumni.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized', 403);
    }

    request.status = 'referred';
    request.referralStatus.hasReferred = true;
    request.referralStatus.referredAt = new Date();
    if (referralLink) {
        request.referralStatus.referralLink = referralLink;
    }

    await request.save();

    // Add notification
    const studentProfile = await StudentProfile.findOne({ user: request.student });
    if (studentProfile) {
        studentProfile.notifications.push({
            type: 'referral',
            message: `Great news! Your referral for ${request.targetCompany} has been submitted successfully!`,
            read: false
        });
        await studentProfile.save();
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Withdraw referral request
// @route   PUT /api/referral/:id/withdraw
// @access  Private (Student)
exports.withdrawRequest = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const request = await ReferralRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.student.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized', 403);
    }

    if (!['requested', 'under_review'].includes(request.status)) {
        throw new AppError('Cannot withdraw this request', 400);
    }

    request.status = 'withdrawn';
    request.withdrawnReason = reason || '';
    await request.save();

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Get referral statistics
// @route   GET /api/referral/stats
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
    let matchQuery = {};

    if (req.user.role === 'student') {
        matchQuery.student = req.user._id;
    } else if (req.user.role === 'alumni') {
        matchQuery.alumni = req.user._id;
    }

    const stats = await ReferralRequest.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const companyStats = await ReferralRequest.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$targetCompany',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    res.status(200).json({
        success: true,
        data: {
            byStatus: stats,
            topCompanies: companyStats
        }
    });
});
