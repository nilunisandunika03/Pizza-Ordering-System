const mongoose = require('mongoose');

/**
 * Production-ready MongoDB connection with optimizations
 */
const connectDB = async () => {
    try {
        const options = {
            // Connection pool settings
            maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
            minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 2,
            
            // Timeout settings
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            
            // Automatic reconnection
            heartbeatFrequencyMS: 10000, // Check connection every 10s
            
            // Performance optimizations
            compressors: ['zlib'], // Enable compression for network traffic
            
            // Write concern for production
            w: process.env.NODE_ENV === 'production' ? 'majority' : 1,
            
            // Read preference
            readPreference: 'primaryPreferred',
            
            // Retry writes
            retryWrites: true,
            retryReads: true
        };

        const conn = await mongoose.connect(
            process.env.MONGO_URI || 'mongodb://localhost:27017/pizza_ordering_system',
            options
        );

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);
        console.log(`   Pool Size: ${options.maxPoolSize}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected successfully');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        });

        return conn;

    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        
        // Detailed error information
        if (error.name === 'MongoServerSelectionError') {
            console.error('\nPossible causes:');
            console.error('  1. MongoDB server is not running');
            console.error('  2. Incorrect MONGO_URI in .env file');
            console.error('  3. Network/firewall blocking the connection');
            console.error('  4. MongoDB authentication failed\n');
        }

        process.exit(1);
    }
};

/**
 * Create database indexes for performance
 */
const createIndexes = async () => {
    try {
        const User = require('./models/User');
        const Product = require('./models/Product');
        const Order = require('./models/Order');
        const Category = require('./models/Category');

        console.log('Creating database indexes...');

        // User indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ createdAt: -1 });
        await User.collection.createIndex({ 'deviceFingerprint.hash': 1 });
        
        // Product indexes
        await Product.collection.createIndex({ category: 1 });
        await Product.collection.createIndex({ price: 1 });
        await Product.collection.createIndex({ name: 'text', description: 'text' });
        
        // Order indexes
        await Order.collection.createIndex({ user: 1, createdAt: -1 });
        await Order.collection.createIndex({ status: 1 });
        await Order.collection.createIndex({ transactionId: 1 });
        await Order.collection.createIndex({ createdAt: -1 });
        
        // Category indexes
        await Category.collection.createIndex({ name: 1 }, { unique: true });

        console.log('✅ Database indexes created successfully');

    } catch (error) {
        console.error('Error creating indexes:', error.message);
        // Don't exit - indexes are optimization, not critical
    }
};

module.exports = { connectDB, createIndexes };

