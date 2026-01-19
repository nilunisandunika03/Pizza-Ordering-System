const mongoose = require('mongoose');
const User = require('../database/models/User');
require('dotenv').config({ path: '../.env' });

const action = process.argv[2];
const email = process.argv[3];

if (!action || !email) {
    console.log('Usage:');
    console.log('  node auth-helper.js verify <email>');
    console.log('  node auth-helper.js otp <email>');
    process.exit(1);
}

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizza_ordering_system');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        if (action === 'verify') {
            user.is_verified = true;
            user.verification_token = null;
            user.verification_token_expires = null;
            await user.save();
            console.log(`Success: User ${email} is now verified!`);
        } else if (action === 'otp') {
            if (user.mfa_secret) {
                console.log(`Current OTP for ${email}: ${user.mfa_secret}`);
            } else {
                console.log(`No active OTP found for ${email}. (Try logging in first)`);
            }
        } else {
            console.log('Unknown action. Use "verify" or "otp".');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

run();
