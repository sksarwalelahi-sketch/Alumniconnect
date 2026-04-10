const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * AI-Powered Matching Algorithm
 * Calculates compatibility score between student and alumni based on:
 * - Skill similarity (Jaccard similarity)
 * - Domain match weight
 * - Experience weight
 * - Career interest alignment
 */

// Calculate Jaccard Similarity between two arrays
const calculateJaccardSimilarity = (arr1, arr2) => {
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    if (set1.size === 0 && set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
};

// Calculate domain match score
const calculateDomainMatch = (studentInterests, alumniDomains) => {
    if (!studentInterests || !alumniDomains || studentInterests.length === 0) return 0;

    const normalizedInterests = studentInterests.map(i => i.toLowerCase());
    const normalizedDomains = alumniDomains.map(d => d.toLowerCase());

    let matches = 0;
    normalizedInterests.forEach(interest => {
        normalizedDomains.forEach(domain => {
            if (domain.includes(interest) || interest.includes(domain)) {
                matches++;
            }
        });
    });

    return (matches / normalizedInterests.length) * 100;
};

// Calculate experience weight (normalized)
const calculateExperienceWeight = (experienceYears) => {
    // More experienced mentors get higher weight, capped at 20 years
    return Math.min(experienceYears / 20, 1) * 100;
};

// Calculate career interest alignment
const calculateCareerAlignment = (studentInterests, alumniDomains) => {
    const interestSet = new Set(studentInterests.map(i => i.toLowerCase()));
    const domainSet = new Set(alumniDomains.map(d => d.toLowerCase()));

    let alignment = 0;
    interestSet.forEach(interest => {
        domainSet.forEach(domain => {
            // Check for partial matches
            if (domain.includes(interest) || interest.includes(domain)) {
                alignment += 1;
            }
        });
    });

    // Normalize
    const totalPossible = interestSet.size * domainSet.size || 1;
    return (alignment / totalPossible) * 100;
};

// Main AI Matching Algorithm
const calculateMatchScore = (student, alumni) => {
    let score = 0;
    const weights = {
        skillSimilarity: 0.35,      // 35% weight
        domainMatch: 0.30,          // 30% weight
        experienceWeight: 0.20,     // 20% weight
        careerAlignment: 0.15        // 15% weight
    };

    // 1. Skill similarity (Jaccard)
    const skillScore = calculateJaccardSimilarity(
        student.skills || [],
        alumni.skills || []
    );
    score += skillScore * weights.skillSimilarity * 100;

    // 2. Domain match
    const domainScore = calculateDomainMatch(
        student.careerInterests || [],
        alumni.domains || []
    );
    score += (domainScore / 100) * weights.domainMatch * 100;

    // 3. Experience weight
    const expScore = calculateExperienceWeight(alumni.experienceYears || 0);
    score += (expScore / 100) * weights.experienceWeight * 100;

    // 4. Career interest alignment
    const careerScore = calculateCareerAlignment(
        student.careerInterests || [],
        alumni.domains || []
    );
    score += (careerScore / 100) * weights.careerAlignment * 100;

    // Bonus points
    if (alumni.isAvailableForMentorship) score += 2;
    if (alumni.isAvailableForReferrals) score += 2;
    if (alumni.rating && alumni.rating.average >= 4) score += 1;

    return Math.min(Math.round(score * 100) / 100, 100);
};

// Get top matches for a student
const getTopMatches = (student, alumniProfiles, limit = 5) => {
    const matches = alumniProfiles.map(alumni => {
        const matchScore = calculateMatchScore(student, alumni);
        return {
            ...alumni.toObject(),
            matchScore,
            matchReasons: getMatchReasons(student, alumni)
        };
    });

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top N matches
    return matches.slice(0, limit);
};

// Get reasons for match
const getMatchReasons = (student, alumni) => {
    const reasons = [];

    // Skill matches
    const studentSkills = new Set(student.skills?.map(s => s.toLowerCase()) || []);
    const alumniSkills = new Set(alumni.skills?.map(s => s.toLowerCase()) || []);
    const matchingSkills = [...studentSkills].filter(s => alumniSkills.has(s));

    if (matchingSkills.length > 0) {
        reasons.push(`${matchingSkills.length} matching skills: ${matchingSkills.join(', ')}`);
    }

    // Domain matches
    const studentInterests = student.careerInterests || [];
    const alumniDomains = alumni.domains || [];
    const matchingDomains = studentInterests.filter(i =>
        alumniDomains.some(d => d.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(d.toLowerCase()))
    );

    if (matchingDomains.length > 0) {
        reasons.push(`Domain expertise: ${matchingDomains.join(', ')}`);
    }

    // Experience
    if (alumni.experienceYears >= 5) {
        reasons.push(`${alumni.experienceYears} years of experience`);
    }

    return reasons;
};

// @desc    Get matched mentors for a student
// @route   GET /api/match/mentors
// @access  Private (Student)
exports.getMatchedMentors = asyncHandler(async (req, res) => {
    const {
        limit = 5,
        domain,
        skills,
        minExperience,
        company,
        availableForReferral
    } = req.query;

    // Get student profile
    const student = await StudentProfile.findOne({ user: req.user._id });

    if (!student) {
        throw new AppError('Please complete your profile first', 400);
    }

    // Get available alumni
    const requireVerified = process.env.NODE_ENV === 'production';
    const query = {
        isAvailableForMentorship: true
    };

    if (requireVerified) query.isVerified = true;

    if (domain) query.domains = { $in: [domain] };
    if (company) query.company = { $regex: company, $options: 'i' };
    if (minExperience) query.experienceYears = { $gte: parseInt(minExperience) };
    if (availableForReferral === 'true') query.isAvailableForReferrals = true;
    if (skills) {
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (skillList.length > 0) query.skills = { $in: skillList };
    }

    const alumniProfiles = await AlumniProfile.find(query)
        .populate('user', 'email lastLogin isActive');

    // Get existing mentorship requests to exclude
    const existingRequests = await MentorshipRequest.find({
        student: req.user._id,
        status: { $in: ['pending', 'approved'] }
    }).select('alumni');

    const excludedAlumniIds = existingRequests.map(r => r.alumni.toString());

    // Filter out already connected alumni
    const availableAlumni = alumniProfiles.filter(
        a => a.user?.isActive !== false && !excludedAlumniIds.includes(a.user._id.toString())
    );

    // Get top matches using AI algorithm
    const matches = getTopMatches(student, availableAlumni, parseInt(limit));

    res.status(200).json({
        success: true,
        data: {
            matches,
            studentProfile: {
                skills: student.skills,
                interests: student.careerInterests
            }
        }
    });
});

// @desc    Get match score for specific mentor
// @route   GET /api/match/score/:alumniId
// @access  Private (Student)
exports.getMatchScore = asyncHandler(async (req, res) => {
    const { alumniId } = req.params;

    // Get student profile
    const student = await StudentProfile.findOne({ user: req.user._id });

    if (!student) {
        throw new AppError('Please complete your profile first', 400);
    }

    // Get alumni profile (support profile ID or user ID)
    let alumni = await AlumniProfile.findById(alumniId).populate('user', 'email');
    if (!alumni) {
        alumni = await AlumniProfile.findOne({ user: alumniId })
            .populate('user', 'email');
    }

    if (!alumni) {
        throw new AppError('Alumni not found', 404);
    }

    // Calculate match score
    const matchScore = calculateMatchScore(student, alumni);
    const matchReasons = getMatchReasons(student, alumni);

    // Check if already connected
    const existingRequest = await MentorshipRequest.findOne({
        student: req.user._id,
        alumni: alumni.user,
        status: { $in: ['pending', 'approved'] }
    });

    res.status(200).json({
        success: true,
        data: {
            alumni: {
                id: alumni._id,
                name: alumni.name,
                company: alumni.company,
                designation: alumni.designation,
                skills: alumni.skills,
                domains: alumni.domains,
                experienceYears: alumni.experienceYears,
                linkedInUrl: alumni.linkedInUrl
            },
            matchScore,
            matchReasons,
            connectionStatus: existingRequest ? existingRequest.status : 'none'
        }
    });
});

// @desc    Search mentors with filters
// @route   GET /api/match/search
// @access  Private (Student)
exports.searchMentors = asyncHandler(async (req, res) => {
    const {
        domain,
        skills,
        minExperience,
        company,
        availableForReferral,
        page = 1,
        limit = 20
    } = req.query;

    const requireVerified = process.env.NODE_ENV === 'production';
    const query = {
        isAvailableForMentorship: true
    };

    if (requireVerified) query.isVerified = true;

    if (domain) query.domains = { $in: [domain] };
    if (company) query.company = { $regex: company, $options: 'i' };
    if (minExperience) query.experienceYears = { $gte: parseInt(minExperience) };
    if (availableForReferral === 'true') query.isAvailableForReferrals = true;
    if (skills) {
        const skillList = skills.split(',').map(s => s.trim());
        query.skills = { $in: skillList };
    }

    const alumni = await AlumniProfile.find(query)
        .populate('user', 'email lastLogin isActive')
        .select('-notifications')
        .sort({ experienceYears: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await AlumniProfile.countDocuments(query);

    // Calculate match scores if student profile exists
    const student = await StudentProfile.findOne({ user: req.user._id });

    if (student) {
        const alumniWithScores = alumni
            .filter(a => a.user?.isActive !== false)
            .map(a => ({
                ...a.toObject(),
                matchScore: calculateMatchScore(student, a)
            }));

        return res.status(200).json({
            success: true,
            data: {
                alumni: alumniWithScores,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    }

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

// @desc    Get matching statistics
// @route   GET /api/match/stats
// @access  Private (Admin)
exports.getMatchStats = asyncHandler(async (req, res) => {
    const { AlumniProfile, StudentProfile } = require('../models');

    const requireVerified = process.env.NODE_ENV === 'production';
    const totalAlumni = await AlumniProfile.countDocuments(
        requireVerified ? { isVerified: true } : {}
    );
    const totalStudents = await StudentProfile.countDocuments();

    const availableMentorsQuery = { isAvailableForMentorship: true };
    if (requireVerified) availableMentorsQuery.isVerified = true;
    const availableMentors = await AlumniProfile.countDocuments(availableMentorsQuery);

    const avgMatchScore = await MentorshipRequest.aggregate([
        {
            $match: { matchScore: { $exists: true } }
        },
        {
            $group: {
                _id: null,
                avgScore: { $avg: '$matchScore' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalAlumni,
            totalStudents,
            availableMentors,
            averageMatchScore: avgMatchScore[0]?.avgScore || 0
        }
    });
});

module.exports = exports;
module.exports.calculateMatchScore = calculateMatchScore;
module.exports.getMatchReasons = getMatchReasons;
