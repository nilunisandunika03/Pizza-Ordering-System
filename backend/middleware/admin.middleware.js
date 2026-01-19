const isAdmin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    try {
        const User = require('../database/models/User');
        const user = await User.findById(req.session.userId).select('role');

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Authorization error' });
    }
};

// Middleware with user check
const requireAdmin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    try {
        const User = require('../database/models/User');
        const user = await User.findById(req.session.userId).select('role');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Authorization error' });
    }
};

module.exports = { isAdmin, requireAdmin };
