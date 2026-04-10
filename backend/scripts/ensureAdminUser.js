require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const usage = () => {
    console.log('Usage: node scripts/ensureAdminUser.js <email> <password>');
    console.log('Or set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
};

const run = async () => {
    const emailArg = process.argv[2];
    const passwordArg = process.argv[3];

    const email = (emailArg || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = (passwordArg || process.env.ADMIN_PASSWORD || '').trim();

    if (!email || !password) {
        usage();
        process.exit(1);
    }

    if (password.length < 6) {
        console.error('ADMIN_PASSWORD must be at least 6 characters.');
        process.exit(1);
    }

    await connectDB();

    let user = await User.findOne({ email }).select('+password');

    if (!user) {
        user = new User({
            email,
            password,
            role: 'admin',
            isVerified: true,
            isActive: true
        });
        await user.save();
        console.log(`Admin user created: ${email}`);
    } else {
        user.role = 'admin';
        user.isVerified = true;
        user.isActive = true;
        user.password = password;
        await user.save();
        console.log(`Admin user updated: ${email}`);
    }

    process.exit(0);
};

run().catch((error) => {
    console.error('Failed to ensure admin user:', error.message);
    process.exit(1);
});
