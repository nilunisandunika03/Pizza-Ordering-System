const express = require('express');
const router = express.Router();
const svgCaptcha = require('svg-captcha');
const otpGenerator = require('otp-generator');
const { body, validationResult } = require('express-validator');
const User = require('../database/models/User');
const { sendEmail } = require('../utils/email');
const { isAuthenticated } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const argon2 = require('argon2');
const { checkIPRegistrationLimit, getIPStats } = require('../utils/ipTracker');
const { regenerateSession } = require('../middleware/security.middleware');
const logger = require('../utils/logger');
const csrf = require('csurf');

// Frontend URL for email links (use environment variable in production)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CSRF protection for state-changing auth operations - using cookie-based
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
});

// --- Helper Functions ---
const generateOTP = () => otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });

// --- Rate Limiters ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { message: 'Too many attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Requirement: 5 attempts / 15 min
    message: { message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Routes ---

// 1. Get CAPTCHA
router.get('/captcha', (req, res) => {
    const captcha = svgCaptcha.create({
        size: 6,
        noise: 2,
        color: true,
        background: '#cc9966'
    });
    req.session.captcha = captcha.text;
    res.status(200).json({ svg: captcha.data });
});

// 1.1 Verify CAPTCHA (Generic)
router.post('/verify-captcha', (req, res) => {
    const { captcha } = req.body;
    if (!req.session.captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
        return res.status(400).json({ message: 'Invalid CAPTCHA' });
    }
    // We don't clear it here so it can be used for the next step if immediate, 
    // but usually we should clear it. For generic "are you human" checks, clearing is safer.
    req.session.captcha = null;
    res.status(200).json({ message: 'CAPTCHA verified' });
});

// 2. Register
router.post('/register', csrfProtection, authLimiter, [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('captcha').notEmpty().withMessage('Captcha is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Check if password validation failed
        const passwordError = errors.array().find(err => err.path === 'password');
        
        if (passwordError) {
            return res.status(400).json({ 
                errors: errors.array(),
                passwordGuidelines: {
                    message: 'Your password does not meet the security requirements',
                    requirements: [
                        '✓ Minimum 8 characters',
                        '✓ At least one uppercase letter (A-Z)',
                        '✓ At least one lowercase letter (a-z)',
                        '✓ At least one number (0-9)',
                        '✓ At least one special character (@$!%*?&#)'
                    ],
                    example: 'Example: MyP@ssw0rd'
                }
            });
        }
        
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, captcha, address } = req.body;

    try {
        // --- IP-Based Registration Limit Check ---
        const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        if (!checkIPRegistrationLimit(clientIP)) {
            const stats = getIPStats(clientIP);
            logger.warn('Registration blocked - IP exceeded daily limit', { ip: clientIP });
            return res.status(429).json({ 
                message: `Too many accounts registered from this network. Please try again in ${stats.resetIn} minutes.`,
                limitExceeded: true,
                resetIn: stats.resetIn
            });
        }

        // Validate CAPTCHA first
        if (!req.session.captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
            req.session.captcha = null; // Clear captcha
            return res.status(400).json({ message: 'Invalid CAPTCHA' });
        }

        // System checks Database for existing email
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        // IF Email Exists: Stop! Do not send a verification email.
        if (existingUser) {
            logger.info('Registration attempt with existing email', { email: email.toLowerCase() });
            req.session.captcha = null; // Clear captcha
            // Popup Message: "This email is already registered. Please login instead."
            return res.status(400).json({ 
                message: 'This email is already registered. Please login instead.',
                suggestLogin: true 
            });
        }

        // IF Email DOES NOT Exist: Create the temporary user record
        const verification_token = crypto.randomBytes(32).toString('hex');
        const verification_token_expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        const userData = {
            email: email.toLowerCase(), // Ensure lowercase
            password_hash: password,
            full_name: fullName,
            verification_token,
            verification_token_expires,
            role: 'customer'
        };

        if (address) {
            userData.address = address;
        }

        const newUser = await User.create(userData);
        logger.info('New user registered', { email: newUser.email, ip: clientIP });

        req.session.captcha = null;

        // Send the Gmail verification code (using environment variable for URL)
        const verifyLink = `${FRONTEND_URL}/verify-email?token=${verification_token}`;
        await sendEmail(email, 'Verify your email', `
            <h3>Welcome to PizzaSlice!</h3>
            <p>Please click the link below to verify your email address (expires in 10 minutes):</p>
            <a href="${verifyLink}">Verify Email</a>
        `);
        
        // Popup Message: "Registration successful! Please check your email for the 6-digit verification code."
        res.status(201).json({ message: 'Registration successful! Please check your email for verification.' });
    } catch (error) {
        console.error('Registration Error:', error);
        
        // Check for duplicate key error (MongoDB unique constraint)
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'This email is already registered. Please login instead.',
                suggestLogin: true 
            });
        }
        
        res.status(500).json({ message: 'Server error during registration' });
    }
});


router.post('/verify-email', csrfProtection, authLimiter, async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    try {
        // When the user clicks the link, check the timestamp
        const user = await User.findOne({ verification_token: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid verification token' });
        }

        // Check if link is expired (10 minutes)
        if (user.verification_token_expires < Date.now()) {
            // If Expired: Show "Link expired. [Resend Verification Email]."
            return res.status(400).json({ 
                message: 'Link expired. Please resend verification email.',
                expired: true,
                email: user.email
            });
        }

        // If Valid: Change status to is_verified: true
        user.is_verified = true;
        user.verification_token = null;
        user.verification_token_expires = null;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during verification' });
    }
});

// Resend Verification Email
router.post('/resend-verification', csrfProtection, authLimiter, [
    body('email').isEmail().withMessage('Invalid email format')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'Email is already verified. Please login.' });
        }

        // Generate new verification token with 10-minute expiry
        const verification_token = crypto.randomBytes(32).toString('hex');
        user.verification_token = verification_token;
        user.verification_token_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const verifyLink = `${FRONTEND_URL}/verify-email?token=${verification_token}`;
        await sendEmail(email, 'Verify your email', `
            <h3>Welcome to PizzaSlice!</h3>
            <p>Please click the link below to verify your email address (expires in 10 minutes):</p>
            <a href="${verifyLink}">Verify Email</a>
        `);

        res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
    } catch (error) {
        logger.error('Resend verification error', { error: error.message, email });
        res.status(500).json({ message: 'Server error while resending verification email' });
    }
});


router.post('/login', csrfProtection, loginLimiter, [
    body('email').isEmail(),
    body('password').notEmpty(),
    body('captcha').notEmpty()
], async (req, res) => {
    const { email, password, captcha } = req.body;

    try {
        logger.info('Login attempt', { email, ip: req.ip });

        // IF captcha_is_wrong: SHOW "Invalid captcha. Please try again." REFRESH_CAPTCHA() STOP
        if (!req.session.captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
            logger.warn('Login failed - invalid CAPTCHA', { email });
            req.session.captcha = null; // Clear captcha to force refresh
            return res.status(400).json({ message: 'Invalid captcha. Please try again.' });
        }

        const user = await User.findOne({ email });
        
        // IF email_or_password_is_wrong: SHOW "Invalid email or password." REFRESH_CAPTCHA() STOP
        if (!user) {
            logger.warn('Login failed - user not found', { email });
            req.session.captcha = null; // Clear captcha to force refresh
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.lock_until && user.lock_until > Date.now()) {
            req.session.captcha = null; // Clear captcha to force refresh
            return res.status(403).json({
                message: `Account locked due to multiple failed attempts. Try again later.`
            });
        }

        if (!user.is_verified) {
            logger.warn('Login failed - user not verified', { email });
            req.session.captcha = null; // Clear captcha to force refresh
            return res.status(401).json({ message: 'Please verify your email first' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            logger.warn('Login failed - password mismatch', { email });
            user.failed_login_attempts += 1;
            if (user.failed_login_attempts >= 5) {
                user.lock_until = Date.now() + 15 * 60 * 1000;
            }
            await user.save();
            req.session.captcha = null; // Clear captcha to force refresh
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // ELSE: LOG_USER_IN()
        user.failed_login_attempts = 0;
        user.lock_until = null;

        const otp = generateOTP();
        // Hash OTP before storing for security
        const hashedOtp = await argon2.hash(otp, { type: argon2.argon2id });
        user.mfa_secret = hashedOtp;
        user.mfa_secret_expires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
        await user.save();

        // Clear captcha only on successful credentials and OTP generation
        req.session.captcha = null;

        await sendEmail(user.email, 'Your Login OTP', `<p>Your verification code is: <strong>${otp}</strong></p>`);
        req.session.preAuthUserId = user._id;

        res.status(200).json({ message: 'OTP sent to email', requireMfa: true });
    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ message: 'Login error' });
    }
});

// 5. Verify OTP & Finalize Login
router.post('/verify-otp', csrfProtection, loginLimiter, regenerateSession, async (req, res) => {
    const { otp } = req.body;
    const userId = req.session.preAuthUserId;

    if (!userId) return res.status(401).json({ message: 'Session expired. Please login again.' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(401).json({ message: 'User not found' });

        // Check if OTP has expired
        if (!user.mfa_secret_expires || user.mfa_secret_expires < Date.now()) {
            user.mfa_secret = null;
            user.mfa_secret_expires = null;
            await user.save();
            return res.status(400).json({ 
                message: 'OTP expired. Please login again.',
                expired: true
            });
        }

        // Verify hashed OTP using argon2
        let isValidOtp = false;
        try {
            isValidOtp = await argon2.verify(user.mfa_secret, otp);
        } catch (verifyError) {
            // If verification fails (e.g., invalid hash format), treat as invalid
            isValidOtp = false;
        }

        if (!isValidOtp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Session already regenerated by middleware
        req.session.userId = user._id;
        req.session.preAuthUserId = null; // Clear pre-auth ID
        
        user.mfa_secret = null;
        user.mfa_secret_expires = null; // Clear expiry timestamp
        user.last_login = new Date();
        await user.save();

        logger.info('User logged in successfully', { userId: user._id, email: user.email });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                address: user.address,
                savedCards: user.savedCards
            }
        });

    } catch (error) {
        logger.error('OTP verification error', { error: error.message });
        res.status(500).json({ message: 'Verification error' });
    }
});


router.post('/logout', csrfProtection, (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('sessionId');
        res.json({ message: 'Logged out successfully' });
    });
});


router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('full_name email is_verified address role savedCards');
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
});


router.put('/profile', isAuthenticated, [
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { fullName, address } = req.body;

        if (fullName) user.full_name = fullName;
        if (address !== undefined) user.address = address;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                fullName: user.full_name,
                email: user.email,
                address: user.address,
                is_verified: user.is_verified
            }
        });
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

module.exports = router;
