/**
 * Enhanced Security Middleware Collection
 * Implements defense-in-depth security controls
 */

const rateLimit = require('express-rate-limit');

/**
 * Session Fixation Protection
 * Regenerates session ID at critical authentication points
 */
const regenerateSession = (req, res, next) => {
    if (req.session) {
        const userData = req.session.userId;
        const preAuthData = req.session.preAuthUserId; // Preserve pre-auth data for OTP verification
        req.session.regenerate((err) => {
            if (err) {
                console.error('[SECURITY] Session regeneration failed:', err);
                return next(err);
            }
            if (userData) {
                req.session.userId = userData;
            }
            if (preAuthData) {
                req.session.preAuthUserId = preAuthData; // Restore pre-auth data
            }
            next();
        });
    } else {
        next();
    }
};

/**
 * Device/Browser Fingerprinting for Session Binding
 * Prevents session hijacking by binding sessions to device characteristics
 */
const deviceFingerprint = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Create a fingerprint hash
    const crypto = require('crypto');
    const fingerprint = crypto
        .createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding)
        .digest('hex');
    
    if (req.session.userId) {
        // Check if fingerprint matches for existing session
        if (req.session.deviceFingerprint && req.session.deviceFingerprint !== fingerprint) {
            console.log('[SECURITY] Device fingerprint mismatch - possible session hijacking');
            // Destroy session and force re-login
            req.session.destroy();
            return res.status(401).json({ 
                message: 'Session invalid. Please login again.',
                securityAlert: true 
            });
        }
        
        // Store fingerprint on first authenticated request
        if (!req.session.deviceFingerprint) {
            req.session.deviceFingerprint = fingerprint;
        }
    }
    
    next();
};

/**
 * Advanced Rate Limiting for API endpoints
 * Prevents automated scraping and inventory monitoring
 */
const apiRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per 5 minutes
    message: { message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Strict Rate Limiter for sensitive operations
 */
const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: { message: 'Too many attempts. Please try again after 15 minutes.' }
});

/**
 * IP Throttling for suspicious patterns
 * Detects and blocks rapid successive requests
 */
const ipThrottlingMap = new Map();

const ipThrottling = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 1000; // 1 second window
    const maxRequests = 10; // Max 10 requests per second
    
    const ipData = ipThrottlingMap.get(ip) || { requests: [], blocked: false, blockedUntil: 0 };
    
    // Check if IP is currently blocked
    if (ipData.blocked && now < ipData.blockedUntil) {
        return res.status(429).json({ 
            message: 'Too many requests. IP temporarily blocked.',
            retryAfter: Math.ceil((ipData.blockedUntil - now) / 1000)
        });
    }
    
    // Clean old requests outside the window
    ipData.requests = ipData.requests.filter(timestamp => now - timestamp < windowMs);
    
    // Add current request
    ipData.requests.push(now);
    
    // Check if limit exceeded
    if (ipData.requests.length > maxRequests) {
        console.log(`[SECURITY] IP throttling triggered for ${ip}`);
        ipData.blocked = true;
        ipData.blockedUntil = now + 60000; // Block for 1 minute
        ipThrottlingMap.set(ip, ipData);
        return res.status(429).json({ 
            message: 'Suspicious activity detected. IP temporarily blocked.',
            retryAfter: 60
        });
    }
    
    ipThrottlingMap.set(ip, ipData);
    next();
};

// Cleanup throttling map every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipThrottlingMap.entries()) {
        if (data.blocked && now > data.blockedUntil) {
            ipThrottlingMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

/**
 * Session Activity Timeout
 * Logs out users after period of inactivity
 */
const sessionActivityTimeout = (req, res, next) => {
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    
    if (req.session.userId) {
        const lastActivity = req.session.lastActivity || Date.now();
        const now = Date.now();
        
        if (now - lastActivity > TIMEOUT_MS) {
            console.log('[SECURITY] Session timeout - user logged out due to inactivity');
            req.session.destroy();
            return res.status(401).json({ 
                message: 'Session expired due to inactivity. Please login again.',
                sessionExpired: true
            });
        }
        
        req.session.lastActivity = now;
    }
    
    next();
};

/**
 * Content Security Policy Headers
 * Enhanced XSS protection
 */
const cspHeaders = (req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.stripe.com; " +
        "frame-src https://js.stripe.com; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );
    next();
};

/**
 * HSTS Header for HTTPS enforcement
 */
const hstsHeader = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
};

/**
 * Additional Security Headers
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Prevent caching of sensitive API responses
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/payment') || req.path.startsWith('/api/order')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

module.exports = {
    regenerateSession,
    deviceFingerprint,
    apiRateLimiter,
    strictRateLimiter,
    ipThrottling,
    sessionActivityTimeout,
    cspHeaders,
    hstsHeader,
    securityHeaders
};
