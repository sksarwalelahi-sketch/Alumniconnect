require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const AlumniProfile = require('../models/AlumniProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const { ChatMessage, Conversation } = require('../models/ChatMessage');

const PASSWORD = '1234567890';

const studentFirstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Krish', 'Arjun', 'Reyansh', 'Ishaan', 'Kabir', 'Rohan', 'Yash',
    'Ananya', 'Diya', 'Ira', 'Aisha', 'Meera', 'Saanvi', 'Riya', 'Priya', 'Kavya', 'Tanya'
];

const alumniFirstNames = [
    'Rahul', 'Neha', 'Siddharth', 'Pooja', 'Aman', 'Sneha', 'Karan', 'Nisha', 'Vikram', 'Anjali',
    'Harsh', 'Shruti', 'Nitin', 'Ishita', 'Manish', 'Ritika', 'Varun', 'Simran', 'Tarun', 'Nandini'
];

const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Gupta', 'Nair', 'Iyer', 'Khan', 'Reddy', 'Mehta', 'Joshi'
];

const colleges = [
    'IIT Delhi', 'IIT Bombay', 'NIT Trichy', 'BITS Pilani', 'VIT Vellore',
    'DTU', 'NSUT', 'IIIT Hyderabad', 'Manipal University', 'SRM University'
];

const branches = [
    'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
    'Mechanical', 'Civil', 'Chemical', 'Biotechnology', 'Other'
];

const domains = [
    'Software Development', 'Data Science', 'Machine Learning', 'Web Development',
    'Mobile Development', 'DevOps', 'Cloud Computing', 'Cybersecurity',
    'Product Management', 'UI/UX Design', 'Data Analysis', 'Consulting',
    'Core Engineering', 'Research', 'Finance', 'Marketing', 'Sales', 'Other'
];

const studentInterests = [
    'Software Development', 'Data Science', 'Machine Learning', 'Web Development',
    'Mobile Development', 'DevOps', 'Cloud Computing', 'Cybersecurity',
    'Product Management', 'UI/UX Design', 'Data Analysis', 'Consulting',
    'Core Engineering', 'Research', 'Entrepreneurship', 'Higher Studies', 'Other'
];

const companies = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple',
    'NVIDIA', 'Adobe', 'Atlassian', 'Salesforce', 'Uber'
];

const designations = [
    'Software Engineer', 'Senior Software Engineer', 'Data Scientist', 'Product Manager',
    'Engineering Manager', 'Cloud Engineer', 'DevOps Engineer', 'Security Engineer'
];

const skills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
    'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'System Design', 'SQL', 'DSA'
];

const requestMessages = [
    'I want mentorship for interview preparation and project guidance.',
    'Can you guide me on backend development and career planning?',
    'I am looking for help with resume and internship strategy.',
    'Need support for system design and coding interview practice.',
    'I would appreciate mentorship for moving into product roles.'
];

const feedbackComments = [
    'Very helpful and practical guidance throughout the sessions.',
    'Great mentor, gave clear roadmap and actionable advice.',
    'Excellent support for interview prep and confidence building.',
    'Sessions were structured, insightful, and highly motivating.',
    'Strong technical mentorship with real-world examples.'
];

const chatSamples = [
    'Hi, thanks for accepting my request.',
    'Happy to help. Let us start with your goals.',
    'I am targeting backend and cloud roles.',
    'Great. Share your resume and current project details.',
    'Sure, I will send them by tonight.',
    'Perfect. We can schedule a mock interview next week.',
    'That sounds great, thank you.',
    'Keep practicing DSA daily and track progress.'
];

function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min = 1, max = 3) {
    const count = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
    const pool = [...arr];
    const out = [];
    for (let i = 0; i < count && pool.length > 0; i += 1) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
    }
    return out;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedStatus() {
    const r = Math.random();
    if (r < 0.55) return 'approved';
    if (r < 0.8) return 'pending';
    return 'rejected';
}

async function connect() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing in environment');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000
    });
}

async function createUsersAndProfiles({ studentsCount, alumniCount, batchTag }) {
    const students = [];
    const alumni = [];

    for (let i = 0; i < studentsCount; i += 1) {
        const name = `${pickOne(studentFirstNames)} ${pickOne(lastNames)}`;
        const email = `student.${batchTag}.${i + 1}@demo.local`;
        const user = await User.create({
            email,
            password: PASSWORD,
            role: 'student',
            isVerified: true
        });
        const profile = await StudentProfile.create({
            user: user._id,
            name,
            college: pickOne(colleges),
            branch: pickOne(branches),
            graduationYear: randInt(2026, 2030),
            skills: pickMany(skills, 3, 6),
            careerInterests: pickMany(studentInterests, 2, 4),
            linkedInUrl: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}-${batchTag}-${i + 1}`,
            bio: 'Motivated student looking for career guidance and mentorship.'
        });
        students.push({ user, profile });
    }

    for (let i = 0; i < alumniCount; i += 1) {
        const name = `${pickOne(alumniFirstNames)} ${pickOne(lastNames)}`;
        const email = `alumni.${batchTag}.${i + 1}@demo.local`;
        const user = await User.create({
            email,
            password: PASSWORD,
            role: 'alumni',
            isVerified: true
        });
        const experience = randInt(3, 12);
        const company = pickOne(companies);
        const profile = await AlumniProfile.create({
            user: user._id,
            name,
            company,
            designation: pickOne(designations),
            experienceYears: experience,
            domains: pickMany(domains, 2, 4),
            skills: pickMany(skills, 4, 7),
            isAvailableForReferrals: Math.random() > 0.25,
            isAvailableForMentorship: true,
            companiesCanRefer: pickMany(companies, 1, 3),
            linkedInUrl: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}-${batchTag}-${i + 1}`,
            bio: 'Experienced professional who enjoys mentoring students.',
            workExperience: [
                {
                    company,
                    designation: 'Software Engineer',
                    startYear: 2018,
                    endYear: 2021,
                    isCurrent: false,
                    description: 'Worked on backend and platform services.'
                },
                {
                    company: pickOne(companies),
                    designation: pickOne(designations),
                    startYear: 2021,
                    isCurrent: true,
                    description: 'Leading product and engineering initiatives.'
                }
            ]
        });
        alumni.push({ user, profile });
    }

    return { students, alumni };
}

async function createRequestsAndChats({ students, alumni, requestsCount }) {
    const ratingBuckets = new Map();
    let approvedCount = 0;

    for (let i = 0; i < requestsCount; i += 1) {
        const student = pickOne(students);
        const alumniMember = pickOne(alumni);
        const status = weightedStatus();

        const reqDoc = await MentorshipRequest.create({
            student: student.user._id,
            alumni: alumniMember.user._id,
            studentProfile: student.profile._id,
            alumniProfile: alumniMember.profile._id,
            status,
            message: pickOne(requestMessages),
            goals: pickMany(
                ['Interview Prep', 'Resume Review', 'System Design', 'Career Planning', 'Project Guidance'],
                2,
                3
            ),
            chatEnabled: status === 'approved',
            startedAt: status === 'approved' ? new Date() : undefined,
            rejectedAt: status === 'rejected' ? new Date() : undefined,
            rejectionReason: status === 'rejected' ? 'Not aligned with current mentoring bandwidth.' : undefined
        });

        if (status === 'approved') {
            approvedCount += 1;

            if (Math.random() < 0.6) {
                const studentRating = Math.random() < 0.6 ? 5 : 4;
                const alumniRating = Math.random() < 0.6 ? 5 : 4;
                reqDoc.studentFeedback = {
                    rating: studentRating,
                    comment: pickOne(feedbackComments),
                    givenAt: new Date()
                };
                reqDoc.alumniFeedback = {
                    rating: alumniRating,
                    comment: 'Student was proactive, consistent, and highly engaged.',
                    givenAt: new Date()
                };
                await reqDoc.save();

                const prev = ratingBuckets.get(String(alumniMember.profile._id)) || [];
                prev.push(studentRating);
                ratingBuckets.set(String(alumniMember.profile._id), prev);
            }

            const conversation = await Conversation.getOrCreateConversation(
                student.user._id,
                alumniMember.user._id,
                reqDoc._id
            );

            const msgCount = randInt(4, 8);
            let lastMessageId = null;
            for (let m = 0; m < msgCount; m += 1) {
                const isStudentSender = m % 2 === 0;
                const sender = isStudentSender ? student.user : alumniMember.user;
                const receiver = isStudentSender ? alumniMember.user : student.user;
                const msg = await ChatMessage.create({
                    conversation: conversation._id,
                    sender: sender._id,
                    receiver: receiver._id,
                    message: pickOne(chatSamples),
                    messageType: 'text',
                    isDelivered: true,
                    deliveredAt: new Date(),
                    isRead: Math.random() > 0.35,
                    readAt: Math.random() > 0.35 ? new Date() : undefined
                });
                lastMessageId = msg._id;
            }

            if (lastMessageId) {
                conversation.lastMessage = lastMessageId;
                conversation.lastMessageAt = new Date();
                await conversation.save();
            }
        }
    }

    for (const alumniMember of alumni) {
        const ratings = ratingBuckets.get(String(alumniMember.profile._id)) || [];
        if (!ratings.length) continue;
        const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        await AlumniProfile.findByIdAndUpdate(alumniMember.profile._id, {
            rating: {
                average: Math.round(average * 10) / 10,
                count: ratings.length
            }
        });
    }

    return { approvedCount };
}

async function run() {
    const studentsCount = Number(process.argv[2]) || 8;
    const alumniCount = Number(process.argv[3]) || 6;
    const requestsCount = Number(process.argv[4]) || 18;
    const batchTag = Date.now();

    await connect();

    const { students, alumni } = await createUsersAndProfiles({
        studentsCount,
        alumniCount,
        batchTag
    });

    const { approvedCount } = await createRequestsAndChats({
        students,
        alumni,
        requestsCount
    });

    console.log('Demo data seeded successfully.');
    console.log(`Students created: ${students.length}`);
    console.log(`Alumni created: ${alumni.length}`);
    console.log(`Mentorship requests created: ${requestsCount}`);
    console.log(`Approved requests: ${approvedCount}`);
    console.log(`Password for all seeded users: ${PASSWORD}`);
    console.log(`Email pattern: student.${batchTag}.N@demo.local / alumni.${batchTag}.N@demo.local`);
}

run()
    .catch((error) => {
        console.error('Seeding failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
    });

