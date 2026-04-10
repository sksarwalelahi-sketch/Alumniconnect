const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'User account has been deactivated'
                });
            }

            // Attach user to request
            req.user = user;
            req.userRole = user.role;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token is invalid or expired'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

// Authorize roles - require specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                if (user && user.isActive) {
                    req.user = user;
                    req.userRole = user.role;
                }
            } catch (error) {
                // Token invalid, continue without user
            }
        }

        next();
    } catch (error) {
        next();
    }
};

// Check if user has completed profile
const hasCompleteProfile = async (req, res, next) => {
    try {
        const Profile = req.user.role === 'student'
            ? require('../models/StudentProfile')
            : require('../models/AlumniProfile');

        const profile = await Profile.findOne({ user: req.user._id });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your profile first'
            });
        }

        req.userProfile = profile;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error checking profile'
        });
    }
};

module.exports = {
    protect,
    authorize,
    optionalAuth,
    hasCompleteProfile
};
