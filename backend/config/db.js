const mongoose = require('mongoose');

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const connectDB = async () => {
    const maxInitialDelay = 30000; // max backoff for retries
    let attempt = 0;

    while (true) {
        try {
            attempt += 1;
            const conn = await mongoose.connect(process.env.MONGODB_URI, {
                maxPoolSize: 10,
                // generous server selection timeout for Atlas connectivity
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
            });

            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected. Attempting to reconnect...');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('MongoDB reconnected');
            });

            // connected successfully — break out of retry loop
            break;
        } catch (error) {
            // Log full error for debugging without exiting process
            console.error(`❌ MongoDB connection attempt #${attempt} failed:`);
            console.error(error.stack || error);

            // Exponential backoff with jitter
            const backoff = Math.min(1000 * 2 ** Math.min(attempt, 6), maxInitialDelay);
            const jitter = Math.floor(Math.random() * 500);
            const delay = backoff + jitter;

            console.log(`Waiting ${delay}ms before retrying...`);
            // Wait then retry
            // eslint-disable-next-line no-await-in-loop
            await wait(delay);
        }
    }
};

module.exports = connectDB;
