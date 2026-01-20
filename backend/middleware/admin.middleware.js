const logger = require('../utils/logger');

/**
 * Admin Only Middleware
 * Ensures only admin users can access admin routes
 * Blocks normal users from accessing admin functionality
 */
const adminOnly = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        logger.security('Unauthorized admin access attempt', { ip: req.ip });
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    try {
        const User = require('../database/models/User');
        const user = await User.findById(req.session.userId).select('role email full_name');

        if (!user) {
            logger.security('Admin access attempt with invalid user ID', { 
                userId: req.session.userId, 
                ip: req.ip 
            });
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.role !== 'admin') {
            logger.security('Non-admin user attempted to access admin route', { 
                userId: user._id,
                email: user.email,
                role: user.role,
                path: req.path,
                ip: req.ip 
            });
            return res.status(403).json({ 
                message: 'Access denied. Admin privileges required.',
                userRole: 'customer'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Admin middleware error', { error: error.message });
        res.status(500).json({ message: 'Authorization error' });
    }
};

/**
 * User Only Middleware
 * Ensures only normal users (customers) can access user routes
 * Blocks admin users from accessing user functionality (cart, checkout, orders)
 */
const userOnly = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        logger.security('Unauthorized user access attempt', { ip: req.ip });
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    try {
        const User = require('../database/models/User');
        const user = await User.findById(req.session.userId).select('role email full_name');

        if (!user) {
            logger.security('User access attempt with invalid user ID', { 
                userId: req.session.userId, 
                ip: req.ip 
            });
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            logger.security('Admin user attempted to access user-only route', { 
                userId: user._id,
                email: user.email,
                role: user.role,
                path: req.path,
                ip: req.ip 
            });
            return res.status(403).json({ 
                message: 'Access denied. This functionality is for customers only. Admins cannot place orders.',
                userRole: 'admin'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('User middleware error', { error: error.message });
        res.status(500).json({ message: 'Authorization error' });
    }
};

// Legacy aliases for backward compatibility
const isAdmin = adminOnly;
const requireAdmin = adminOnly;

module.exports = { 
    adminOnly, 
    userOnly,
    isAdmin,      // Legacy alias
    requireAdmin  // Legacy alias
};
