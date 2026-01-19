const mongoose = require('mongoose');
const User = require('../database/models/User'); // Adjust path to models
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizza_ordering_system');
        console.log('MongoDB Connected');

        const users = await User.find({}, 'email full_name is_verified role');
        console.log('--- Database Users ---');
        if (users.length === 0) {
            console.log('No users found in database.');
        } else {
            users.forEach(u => {
                console.log(`Email: ${u.email}, Verified: ${u.is_verified}, Role: ${u.role}, ID: ${u._id}`);
            });
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

connectDB();
