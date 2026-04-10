const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { email, password, role, name } = req.body;

    if (!['student', 'alumni'].includes(role)) {
        throw new AppError('Invalid role for public registration', 400);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('User with this email already exists', 400);
    }

    // Create user
    const user = await User.create({
        email,
        password,
        role,
        isVerified: false
    });

    // Do not create full profiles here — require users to complete profiles
    // after registering to avoid creating documents with missing required fields.

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            },
            token
        }
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    // Check if account is active
    if (!user.isActive) {
        throw new AppError('Your account has been deactivated', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get profile
    let profile = null;
    if (user.role === 'student') {
        profile = await StudentProfile.findOne({ user: user._id });
    } else if (user.role === 'alumni') {
        profile = await AlumniProfile.findOne({ user: user._id });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            },
            profile,
            token
        }
    });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Update user password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password updated successfully'
    });
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError('User not found with this email', 404);
    }

    // Generate reset token (simplified - in production use nodemailer)
    const resetToken = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Password reset email sent',
        resetToken // In production, send via email
    });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new AppError('Token is required', 400);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401);
        }

        const newToken = generateToken(user._id);

        res.status(200).json({
            success: true,
            token: newToken
        });
    } catch (error) {
        throw new AppError('Invalid token', 401);
    }
});
