const User = require('../database/models/User');
const logger = require('../utils/logger');

const isAuthenticated = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    try {
        // Check if user exists and is not blocked
        const user = await User.findById(req.session.userId).select('is_blocked blocked_reason');
        
        if (!user) {
            req.session.destroy();
            return res.status(401).json({ message: 'User account not found. Please login again.' });
        }

        if (user.is_blocked) {
            logger.security('Blocked user attempted to access protected route', {
                userId: user._id,
                ip: req.ip,
                path: req.path,
                blockedReason: user.blocked_reason
            });
            
            req.session.destroy();
            return res.status(403).json({ 
                message: 'Your account has been blocked. Please contact support.',
                reason: user.blocked_reason,
                isBlocked: true
            });
        }

        return next();
    } catch (error) {
        logger.error('Error in isAuthenticated middleware', { error: error.message });
        return res.status(500).json({ message: 'Authentication check failed' });
    }
};

module.exports = { isAuthenticated };
