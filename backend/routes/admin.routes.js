const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../database/models/User');
const { adminOnly } = require('../middleware/admin.middleware');
const logger = require('../utils/logger');

// ============================================
// ADMIN PROFILE ROUTES
// ============================================

/**
 * @route   GET /api/admin/profile
 * @desc    Get admin's own profile
 * @access  Admin Only
 */
router.get('/profile', adminOnly, async (req, res) => {
    try {
        const admin = await User.findById(req.session.userId).select('-password_hash -verification_token -mfa_secret -savedCards');
        
        if (!admin) {
            return res.status(404).json({ message: 'Admin profile not found' });
        }

        res.json({
            profile: {
                id: admin._id,
                email: admin.email,
                full_name: admin.full_name,
                role: admin.role,
                is_verified: admin.is_verified,
                mfa_enabled: admin.mfa_enabled,
                last_login: admin.last_login,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }
        });
    } catch (error) {
        logger.error('Error fetching admin profile', { error: error.message, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to fetch admin profile' });
    }
});

/**
 * @route   PUT /api/admin/profile
 * @desc    Update admin's own profile (excluding password and role)
 * @access  Admin Only
 */
router.put('/profile', 
    adminOnly,
    [
        body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { full_name, email } = req.body;
            const updateFields = {};

            if (full_name) updateFields.full_name = full_name;
            
            // Check if email is being changed and if it's already in use
            if (email) {
                const existingUser = await User.findOne({ email, _id: { $ne: req.session.userId } });
                if (existingUser) {
                    return res.status(400).json({ message: 'Email already in use by another account' });
                }
                updateFields.email = email;
            }

            const updatedAdmin = await User.findByIdAndUpdate(
                req.session.userId,
                { $set: updateFields },
                { new: true, runValidators: true }
            ).select('-password_hash -verification_token -mfa_secret -savedCards');

            logger.info('Admin profile updated', { adminId: req.session.userId, updatedFields: Object.keys(updateFields) });

            res.json({
                message: 'Profile updated successfully',
                profile: {
                    id: updatedAdmin._id,
                    email: updatedAdmin.email,
                    full_name: updatedAdmin.full_name,
                    role: updatedAdmin.role,
                    is_verified: updatedAdmin.is_verified,
                    mfa_enabled: updatedAdmin.mfa_enabled,
                    last_login: updatedAdmin.last_login,
                    createdAt: updatedAdmin.createdAt,
                    updatedAt: updatedAdmin.updatedAt
                }
            });
        } catch (error) {
            logger.error('Error updating admin profile', { error: error.message, adminId: req.session.userId });
            res.status(500).json({ message: 'Failed to update admin profile' });
        }
    }
);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin Only
 */
router.get('/users', adminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, is_blocked, search } = req.query;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter = {};
        if (role) filter.role = role;
        if (is_blocked !== undefined) filter.is_blocked = is_blocked === 'true';
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-password_hash -verification_token -mfa_secret -savedCards')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('blocked_by', 'full_name email');

        const total = await User.countDocuments(filter);

        res.json({
            users: users.map(user => ({
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_verified: user.is_verified,
                is_blocked: user.is_blocked,
                blocked_reason: user.blocked_reason,
                blocked_at: user.blocked_at,
                blocked_by: user.blocked_by,
                mfa_enabled: user.mfa_enabled,
                last_login: user.last_login,
                failed_login_attempts: user.failed_login_attempts,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching users', { error: error.message, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user details
 * @access  Admin Only
 */
router.get('/users/:id', adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password_hash -verification_token -mfa_secret -savedCards')
            .populate('blocked_by', 'full_name email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_verified: user.is_verified,
                is_blocked: user.is_blocked,
                blocked_reason: user.blocked_reason,
                blocked_at: user.blocked_at,
                blocked_by: user.blocked_by,
                mfa_enabled: user.mfa_enabled,
                last_login: user.last_login,
                address: user.address,
                failed_login_attempts: user.failed_login_attempts,
                lock_until: user.lock_until,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        logger.error('Error fetching user details', { error: error.message, userId: req.params.id, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to fetch user details' });
    }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information (excluding password and sensitive fields)
 * @access  Admin Only
 */
router.put('/users/:id',
    adminOnly,
    [
        body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
        body('role').optional().isIn(['customer', 'admin']).withMessage('Role must be either customer or admin'),
        body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean'),
        body('address.no').optional().trim(),
        body('address.street').optional().trim(),
        body('address.city').optional().trim(),
        body('address.state').optional().trim(),
        body('address.zip_code').optional().trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { full_name, email, role, is_verified, address } = req.body;

            // Prevent admin from editing themselves through this route
            if (req.params.id === req.session.userId.toString()) {
                return res.status(400).json({ message: 'Use /api/admin/profile to edit your own profile' });
            }

            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const updateFields = {};

            if (full_name) updateFields.full_name = full_name;
            if (role !== undefined) updateFields.role = role;
            if (is_verified !== undefined) updateFields.is_verified = is_verified;
            
            // Check if email is being changed and if it's already in use
            if (email && email !== user.email) {
                const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
                if (existingUser) {
                    return res.status(400).json({ message: 'Email already in use by another account' });
                }
                updateFields.email = email;
            }

            if (address) {
                updateFields.address = { ...user.address, ...address };
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true, runValidators: true }
            ).select('-password_hash -verification_token -mfa_secret -savedCards');

            logger.info('User updated by admin', { 
                userId: req.params.id, 
                adminId: req.session.userId, 
                updatedFields: Object.keys(updateFields) 
            });

            res.json({
                message: 'User updated successfully',
                user: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    full_name: updatedUser.full_name,
                    role: updatedUser.role,
                    is_verified: updatedUser.is_verified,
                    is_blocked: updatedUser.is_blocked,
                    address: updatedUser.address,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt
                }
            });
        } catch (error) {
            logger.error('Error updating user', { error: error.message, userId: req.params.id, adminId: req.session.userId });
            res.status(500).json({ message: 'Failed to update user' });
        }
    }
);

/**
 * @route   PATCH /api/admin/users/:id/block
 * @desc    Block a user account
 * @access  Admin Only
 */
router.patch('/users/:id/block',
    adminOnly,
    [
        body('reason').optional().trim().isLength({ min: 5, max: 500 }).withMessage('Block reason must be between 5 and 500 characters')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { reason } = req.body;

            // Prevent admin from blocking themselves
            if (req.params.id === req.session.userId.toString()) {
                return res.status(400).json({ message: 'You cannot block yourself' });
            }

            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Prevent blocking other admins
            if (user.role === 'admin') {
                return res.status(400).json({ message: 'Cannot block admin users' });
            }

            if (user.is_blocked) {
                return res.status(400).json({ message: 'User is already blocked' });
            }

            user.is_blocked = true;
            user.blocked_reason = reason || 'Blocked by admin';
            user.blocked_at = new Date();
            user.blocked_by = req.session.userId;
            await user.save();

            logger.security('User blocked by admin', {
                userId: user._id,
                userEmail: user.email,
                adminId: req.session.userId,
                reason: reason || 'No reason provided'
            });

            res.json({
                message: 'User blocked successfully',
                user: {
                    id: user._id,
                    email: user.email,
                    is_blocked: user.is_blocked,
                    blocked_reason: user.blocked_reason,
                    blocked_at: user.blocked_at
                }
            });
        } catch (error) {
            logger.error('Error blocking user', { error: error.message, userId: req.params.id, adminId: req.session.userId });
            res.status(500).json({ message: 'Failed to block user' });
        }
    }
);

/**
 * @route   PATCH /api/admin/users/:id/unblock
 * @desc    Unblock a user account
 * @access  Admin Only
 */
router.patch('/users/:id/unblock', adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.is_blocked) {
            return res.status(400).json({ message: 'User is not blocked' });
        }

        user.is_blocked = false;
        user.blocked_reason = null;
        user.blocked_at = null;
        user.blocked_by = null;
        await user.save();

        logger.security('User unblocked by admin', {
            userId: user._id,
            userEmail: user.email,
            adminId: req.session.userId
        });

        res.json({
            message: 'User unblocked successfully',
            user: {
                id: user._id,
                email: user.email,
                is_blocked: user.is_blocked
            }
        });
    } catch (error) {
        logger.error('Error unblocking user', { error: error.message, userId: req.params.id, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to unblock user' });
    }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user account (use with caution)
 * @access  Admin Only
 */
router.delete('/users/:id', adminOnly, async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.session.userId.toString()) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting other admins
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete admin users' });
        }

        await User.findByIdAndDelete(req.params.id);

        logger.security('User deleted by admin', {
            userId: user._id,
            userEmail: user.email,
            adminId: req.session.userId
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user', { error: error.message, userId: req.params.id, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

module.exports = router;
