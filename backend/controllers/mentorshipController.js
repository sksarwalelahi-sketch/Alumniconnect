const MentorshipRequest = require('../models/MentorshipRequest');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const validateSessionPayload = ({ date, startTime, endTime }) => {
    if (!date || !startTime || !endTime) {
        throw new AppError('Date, start time, and end time are required', 400);
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        throw new AppError('Time must be in HH:mm format', 400);
    }

    if (startTime >= endTime) {
        throw new AppError('End time must be after start time', 400);
    }

    const sessionDate = new Date(date);
    if (Number.isNaN(sessionDate.getTime())) {
        throw new AppError('Invalid session date', 400);
    }
};

// @desc    Send mentorship request
// @route   POST /api/mentorship/request
// @access  Private (Student)
exports.sendRequest = asyncHandler(async (req, res) => {
    const { alumniId, message, goals } = req.body;

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

    if (!alumniProfile.isAvailableForMentorship) {
        throw new AppError('Alumni is not available for mentorship', 400);
    }

    // Check for existing request
    const existingRequest = await MentorshipRequest.findOne({
        student: req.user._id,
        alumni: alumniUserId,
        status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
        throw new AppError('You already have a mentorship request with this alumni', 400);
    }

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    if (!studentProfile) {
        throw new AppError('Please complete your profile first', 400);
    }

    // Calculate match score
    const { calculateMatchScore } = require('./matchController');
    const matchScore = calculateMatchScore(studentProfile, alumniProfile);

    // Create request
    const request = await MentorshipRequest.create({
        student: req.user._id,
        alumni: alumniUserId,
        studentProfile: studentProfile._id,
        alumniProfile: alumniProfile._id,
        message,
        goals: goals || [],
        matchScore
    });

    await request.populate([
        { path: 'student', select: 'email' },
        { path: 'studentProfile' },
        { path: 'alumni', select: 'email' },
        { path: 'alumniProfile' }
    ]);

    res.status(201).json({
        success: true,
        data: request
    });
});

// @desc    Get mentorship requests
// @route   GET /api/mentorship/requests
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

    const requests = await MentorshipRequest.find(query)
        .populate('student', 'email')
        .populate('alumni', 'email')
        .populate('studentProfile', 'name profilePhoto college branch graduationYear skills')
        .populate('alumniProfile', 'name profilePhoto company designation experienceYears')
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

// @desc    Get pending requests (for alumni)
// @route   GET /api/mentorship/pending
// @access  Private (Alumni)
exports.getPendingRequests = asyncHandler(async (req, res) => {
    const requests = await MentorshipRequest.find({
        alumni: req.user._id,
        status: 'pending'
    })
        .populate('student', 'email')
        .populate('studentProfile', 'name profilePhoto college branch graduationYear skills careerInterests linkedInUrl')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: requests
    });
});

// @desc    Respond to mentorship request
// @route   PUT /api/mentorship/:id/respond
// @access  Private (Alumni)
exports.respondToRequest = asyncHandler(async (req, res) => {
    const { status, response } = req.body; // status: 'approved' or 'rejected'

    const request = await MentorshipRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.alumni.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized to respond to this request', 403);
    }

    if (request.status !== 'pending') {
        throw new AppError('Request has already been responded to', 400);
    }

    // Update status
    await request.updateStatus(status, response);

    // Add notification to student
    const studentProfile = await StudentProfile.findOne({ user: request.student });
    if (studentProfile) {
        studentProfile.notifications.push({
            type: 'mentorship',
            message: status === 'approved'
                ? `Your mentorship request has been approved! You can now chat with ${request.alumniProfile?.name || 'your mentor'}.`
                : `Your mentorship request has been rejected.`,
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

// @desc    Schedule a session
// @route   POST /api/mentorship/:id/session
// @access  Private
exports.scheduleSession = asyncHandler(async (req, res) => {
    const { date, startTime, endTime, topic, notes } = req.body;
    validateSessionPayload({ date, startTime, endTime });

    const request = await MentorshipRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    // Check authorization
    const isStudent = request.student.toString() === req.user._id.toString();
    const isAlumni = request.alumni.toString() === req.user._id.toString();

    if (!isStudent && !isAlumni) {
        throw new AppError('Not authorized', 403);
    }

    if (request.status !== 'approved') {
        throw new AppError('Mentorship must be approved to schedule sessions', 400);
    }

    // Add session
    request.sessionSchedule.push({
        date,
        startTime,
        endTime,
        topic,
        notes,
        status: 'scheduled',
        scheduledBy: req.user._id
    });

    await request.save();

    res.status(201).json({
        success: true,
        data: request.sessionSchedule
    });
});

// @desc    Update session status
// @route   PUT /api/mentorship/:requestId/session/:sessionId
// @access  Private
exports.updateSession = asyncHandler(async (req, res) => {
    const { status, notes, date, startTime, endTime, topic } = req.body;

    const request = await MentorshipRequest.findById(req.params.requestId);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    const session = request.sessionSchedule.id(req.params.sessionId);

    if (!session) {
        throw new AppError('Session not found', 404);
    }

    const isStudent = request.student.toString() === req.user._id.toString();
    const isAlumni = request.alumni.toString() === req.user._id.toString();
    if (!isStudent && !isAlumni) {
        throw new AppError('Not authorized', 403);
    }

    const nextDate = date || session.date;
    const nextStartTime = startTime || session.startTime;
    const nextEndTime = endTime || session.endTime;
    if (date || startTime || endTime) {
        validateSessionPayload({
            date: nextDate,
            startTime: nextStartTime,
            endTime: nextEndTime
        });
    }

    if (status) session.status = status;
    if (notes) session.notes = notes;
    if (date) session.date = date;
    if (startTime) session.startTime = startTime;
    if (endTime) session.endTime = endTime;
    if (topic !== undefined) session.topic = topic;

    await request.save();

    res.status(200).json({
        success: true,
        data: session
    });
});

// @desc    Complete mentorship with feedback
// @route   POST /api/mentorship/:id/complete
// @access  Private
exports.completeMentorship = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;

    const request = await MentorshipRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    const isStudent = request.student.toString() === req.user._id.toString();
    const isAlumni = request.alumni.toString() === req.user._id.toString();
    if (!isStudent && !isAlumni) {
        throw new AppError('Not authorized', 403);
    }

    if (!['approved', 'completed'].includes(request.status)) {
        throw new AppError('Mentorship must be approved before giving feedback', 400);
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Add feedback
    if (req.user.role === 'student') {
        if (request.studentFeedback?.rating) {
            throw new AppError('Feedback already submitted for this mentorship', 400);
        }
        request.studentFeedback = {
            rating,
            comment,
            givenAt: new Date()
        };
    } else if (req.user.role === 'alumni') {
        if (request.alumniFeedback?.rating) {
            throw new AppError('Feedback already submitted for this mentorship', 400);
        }
        request.alumniFeedback = {
            rating,
            comment,
            givenAt: new Date()
        };
    }

    await request.updateStatus('completed');

    // Update alumni rating if student is giving feedback
    if (req.user.role === 'student' && rating) {
        const alumniProfile = await AlumniProfile.findById(request.alumniProfile);
        if (alumniProfile) {
            alumniProfile.addRating(rating);
            await alumniProfile.save();
        }
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Cancel mentorship request
// @route   PUT /api/mentorship/:id/cancel
// @access  Private (Student)
exports.cancelRequest = asyncHandler(async (req, res) => {
    const request = await MentorshipRequest.findById(req.params.id);

    if (!request) {
        throw new AppError('Request not found', 404);
    }

    if (request.student.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorized', 403);
    }

    if (request.status !== 'pending') {
        throw new AppError('Cannot cancel a request that has already been processed', 400);
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Get mentorship statistics
// @route   GET /api/mentorship/stats
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
    let matchQuery = {};

    if (req.user.role === 'student') {
        matchQuery.student = req.user._id;
    } else if (req.user.role === 'alumni') {
        matchQuery.alumni = req.user._id;
    }

    const stats = await MentorshipRequest.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalSessions = await MentorshipRequest.aggregate([
        { $match: matchQuery },
        { $unwind: '$sessionSchedule' },
        { $count: 'total' }
    ]);

    res.status(200).json({
        success: true,
        data: {
            byStatus: stats,
            totalSessions: totalSessions[0]?.total || 0
        }
    });
});
