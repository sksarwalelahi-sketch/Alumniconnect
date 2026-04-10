const AlumniProfile = require('../models/AlumniProfile');
const { askChatbot } = require('../services/chatbotService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'can', 'career', 'find', 'for', 'from',
    'good', 'help', 'i', 'in', 'is', 'it', 'me', 'mentor', 'mentors', 'my', 'of', 'on', 'or',
    'please', 'the', 'to', 'want', 'with', 'you', 'your'
]);

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractKeywords = (question = '') => {
    const words = String(question || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

    return [...new Set(words)].slice(0, 6);
};

const buildFallbackAnswer = (question, alumni = []) => {
    const normalizedQuestion = String(question || '').trim();

    if (!alumni.length) {
        return `I could not reach the AI service right now, but here is a quick fallback answer.
No direct alumni matches were found for "${normalizedQuestion}".
Try searching with specific skills (for example: React, Java, Data Science, DevOps) or company names.`;
    }

    const suggestions = alumni
        .slice(0, 3)
        .map((a, index) => {
            const name = a.name || 'Alumni';
            const designation = a.designation || 'Professional';
            const company = a.company || 'Company not listed';
            const skills = Array.isArray(a.skills) ? a.skills.slice(0, 4).join(', ') : '';
            const domains = Array.isArray(a.domains) ? a.domains.slice(0, 2).join(', ') : '';
            const focus = skills || domains || 'General mentoring';
            return `${index + 1}. ${name} - ${designation} @ ${company}. Focus: ${focus}`;
        })
        .join('\n');

    return `I could not reach the AI service right now, so this is a local fallback based on your platform data.
For your question "${normalizedQuestion}", these alumni look relevant:
${suggestions}

Suggested next step: open their profiles and send mentorship/referral requests with a short, specific ask.`;
};

exports.chatbot = asyncHandler(async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';

    if (!question) {
        throw new AppError('Question is required', 400);
    }

    if (question.length > 1000) {
        throw new AppError('Question is too long (max 1000 characters)', 400);
    }

    const keywords = extractKeywords(question);
    const regexes = keywords.map((k) => new RegExp(escapeRegex(k), 'i'));
    const fullQuestionRegex = new RegExp(escapeRegex(question), 'i');

    const keywordConditions = regexes.flatMap((searchRegex) => ([
        { skills: searchRegex },
        { domains: searchRegex },
        { company: searchRegex },
        { designation: searchRegex },
        { name: searchRegex }
    ]));

    const query = keywordConditions.length
        ? { $or: keywordConditions }
        : {
            $or: [
                { skills: fullQuestionRegex },
                { domains: fullQuestionRegex },
                { company: fullQuestionRegex },
                { designation: fullQuestionRegex },
                { name: fullQuestionRegex }
            ]
        };

    let alumni = await AlumniProfile.find(query)
        .select('name company designation domains skills experienceYears isAvailableForMentorship isAvailableForReferrals')
        .sort({ isAvailableForMentorship: -1, experienceYears: -1, updatedAt: -1 })
        .limit(6)
        .lean();

    if (!alumni.length) {
        alumni = await AlumniProfile.find({
            $or: [
                { isAvailableForMentorship: true },
                { isAvailableForReferrals: true }
            ]
        })
            .select('name company designation domains skills experienceYears isAvailableForMentorship isAvailableForReferrals')
            .sort({ isAvailableForMentorship: -1, experienceYears: -1, updatedAt: -1 })
            .limit(6)
            .lean();
    }

    const context = JSON.stringify({ matchedAlumni: alumni });
    let answer;
    let source = 'ollama';

    try {
        answer = await askChatbot(question, context);
    } catch (error) {
        const status = error?.status;
        const code = error?.code || error?.error?.code;

        if (status === 429 || code === 'insufficient_quota') {
            answer = buildFallbackAnswer(question, alumni);
            source = 'fallback';
        } else if (status === 401 || status === 403) {
            throw new AppError('AI service authentication failed. Please verify your Ollama setup.', 500);
        } else if (status === 400) {
            throw new AppError('AI service rejected the request. Please try a shorter question.', 400);
        } else if (status === 404) {
            answer = buildFallbackAnswer(question, alumni);
            source = 'fallback';
        } else {
            answer = buildFallbackAnswer(question, alumni);
            source = 'fallback';
        }
    }

    res.status(200).json({
        success: true,
        data: {
            answer,
            matches: alumni.length,
            source
        }
    });
});
