/**
 * Fraud Detection & Prevention System
 * Implements multiple layers of fraud detection for payment processing
 */

const crypto = require('crypto');

// Store recent transactions for duplicate detection
const recentTransactions = new Map();
const suspiciousIPs = new Map();
const cardTestingAttempts = new Map();

/**
 * Transaction Deduplication
 * Prevents duplicate/replay attacks using idempotency
 */
const generateTransactionId = (userId, amount, timestamp) => {
    return crypto
        .createHash('sha256')
        .update(`${userId}-${amount}-${timestamp}`)
        .digest('hex');
};

/**
 * Check if transaction is duplicate
 */
const isDuplicateTransaction = (transactionId) => {
    if (recentTransactions.has(transactionId)) {
        return true;
    }
    
    // Store transaction ID for 10 minutes
    recentTransactions.set(transactionId, Date.now());
    
    // Cleanup old transactions
    setTimeout(() => {
        recentTransactions.delete(transactionId);
    }, 10 * 60 * 1000);
    
    return false;
};

/**
 * Card Testing Detection
 * Detects automated card validation attempts (multiple cards from same IP)
 */
const detectCardTesting = (ip, cardLast4) => {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxAttempts = 3; // Max 3 different cards in 10 minutes
    
    const ipData = cardTestingAttempts.get(ip) || { cards: new Set(), firstAttempt: now };
    
    // Reset if window expired
    if (now - ipData.firstAttempt > windowMs) {
        ipData.cards = new Set();
        ipData.firstAttempt = now;
    }
    
    ipData.cards.add(cardLast4);
    cardTestingAttempts.set(ip, ipData);
    
    if (ipData.cards.size > maxAttempts) {
        console.log(`[FRAUD DETECTION] Card testing detected from IP: ${ip}`);
        markIPSuspicious(ip, 'card_testing');
        return true;
    }
    
    return false;
};

/**
 * Mark IP as suspicious
 */
const markIPSuspicious = (ip, reason) => {
    const now = Date.now();
    const existing = suspiciousIPs.get(ip) || { reasons: [], firstDetection: now, count: 0 };
    
    existing.reasons.push({ reason, timestamp: now });
    existing.count++;
    existing.lastDetection = now;
    
    suspiciousIPs.set(ip, existing);
    
    // Log to security logs
    console.log(`[FRAUD ALERT] IP ${ip} marked suspicious: ${reason} (Count: ${existing.count})`);
};

/**
 * Check if IP is suspicious
 */
const isSuspiciousIP = (ip) => {
    const ipData = suspiciousIPs.get(ip);
    if (!ipData) return false;
    
    const now = Date.now();
    const blockDuration = 60 * 60 * 1000; // 1 hour
    
    // Check if block period has expired
    if (now - ipData.lastDetection > blockDuration) {
        suspiciousIPs.delete(ip);
        return false;
    }
    
    // Block if more than 3 suspicious activities
    return ipData.count >= 3;
};

/**
 * Velocity Check
 * Detects abnormally high transaction frequency
 */
const velocityTracker = new Map();

const checkVelocity = (userId, amount) => {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxTransactions = 5; // Max 5 transactions in 5 minutes
    const maxAmount = 500; // Max $500 total in 5 minutes
    
    const userData = velocityTracker.get(userId) || { transactions: [], totalAmount: 0, firstTransaction: now };
    
    // Clean old transactions
    userData.transactions = userData.transactions.filter(tx => now - tx.timestamp < windowMs);
    
    // Recalculate total
    userData.totalAmount = userData.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Add current transaction
    userData.transactions.push({ amount, timestamp: now });
    userData.totalAmount += amount;
    
    velocityTracker.set(userId, userData);
    
    // Check limits
    if (userData.transactions.length > maxTransactions) {
        console.log(`[FRAUD DETECTION] Velocity limit exceeded for user ${userId}: too many transactions`);
        return { blocked: true, reason: 'Too many transactions in short period' };
    }
    
    if (userData.totalAmount > maxAmount) {
        console.log(`[FRAUD DETECTION] Velocity limit exceeded for user ${userId}: amount too high`);
        return { blocked: true, reason: 'Transaction amount limit exceeded' };
    }
    
    return { blocked: false };
};

/**
 * Amount Validation
 * Detects unusual transaction amounts
 */
const validateTransactionAmount = (amount, orderTotal) => {
    // Check for negative amounts
    if (amount <= 0) {
        return { valid: false, reason: 'Invalid amount' };
    }
    
    // Check for amounts over $1000
    if (amount > 1000) {
        console.log(`[FRAUD DETECTION] Unusually high amount: $${amount}`);
        return { valid: false, reason: 'Amount exceeds maximum limit' };
    }
    
    // Check if payment amount matches order total (prevent tampering)
    const tolerance = 0.01; // Allow 1 cent difference for rounding
    if (Math.abs(amount - orderTotal) > tolerance) {
        console.log(`[FRAUD DETECTION] Payment amount mismatch: Payment=$${amount}, Order=$${orderTotal}`);
        return { valid: false, reason: 'Payment amount does not match order total' };
    }
    
    return { valid: true };
};

/**
 * Device/IP Fingerprinting for Fraud Detection
 */
const analyzeDeviceFingerprint = (req, amount) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    
    const fingerprint = crypto
        .createHash('sha256')
        .update(ip + userAgent + acceptLanguage)
        .digest('hex');
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
        { pattern: /curl|wget|python|scrapy/i, reason: 'Automated tool detected' },
        { pattern: /bot|crawler|spider/i, reason: 'Bot detected' }
    ];
    
    for (const { pattern, reason } of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
            console.log(`[FRAUD DETECTION] Suspicious user agent: ${userAgent}`);
            markIPSuspicious(ip, reason);
            return { suspicious: true, reason };
        }
    }
    
    return { suspicious: false, fingerprint };
};

/**
 * Promo Code Abuse Detection
 */
const promoCodeTracker = new Map();

const checkPromoCodeAbuse = (userId, ip, promoCode) => {
    const key = `${promoCode}`;
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    
    const promoData = promoCodeTracker.get(key) || { users: new Set(), ips: new Set(), firstUse: now };
    
    // Reset if window expired
    if (now - promoData.firstUse > windowMs) {
        promoData.users = new Set();
        promoData.ips = new Set();
        promoData.firstUse = now;
    }
    
    // Check if same user used code multiple times (account farming)
    if (promoData.users.has(userId)) {
        console.log(`[FRAUD DETECTION] Promo code reuse detected: User ${userId} already used ${promoCode}`);
        return { abused: true, reason: 'Promo code already used' };
    }
    
    // Check if same IP used code with different accounts
    promoData.ips.add(ip);
    if (promoData.ips.size > 3) { // Max 3 uses from same IP
        console.log(`[FRAUD DETECTION] Promo code abuse from IP ${ip}: ${promoCode}`);
        markIPSuspicious(ip, 'promo_abuse');
        return { abused: true, reason: 'Promo code abuse detected' };
    }
    
    promoData.users.add(userId);
    promoCodeTracker.set(key, promoData);
    
    return { abused: false };
};

/**
 * Comprehensive Fraud Score Calculation
 */
const calculateFraudScore = (req, userId, amount, orderData) => {
    let score = 0;
    const reasons = [];
    
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check suspicious IP (30 points)
    if (isSuspiciousIP(ip)) {
        score += 30;
        reasons.push('Suspicious IP detected');
    }
    
    // Check device fingerprint (20 points)
    const deviceAnalysis = analyzeDeviceFingerprint(req, amount);
    if (deviceAnalysis.suspicious) {
        score += 20;
        reasons.push(deviceAnalysis.reason);
    }
    
    // Check velocity (25 points)
    const velocityCheck = checkVelocity(userId, amount);
    if (velocityCheck.blocked) {
        score += 25;
        reasons.push(velocityCheck.reason);
    }
    
    // Check amount anomalies (15 points)
    if (amount > 200) {
        score += 10;
        reasons.push('High transaction amount');
    }
    
    // Check new account (10 points)
    // This should be passed from the caller
    if (orderData.isNewAccount) {
        score += 10;
        reasons.push('New account');
    }
    
    // Determine risk level
    let riskLevel = 'low';
    if (score >= 50) riskLevel = 'high';
    else if (score >= 25) riskLevel = 'medium';
    
    console.log(`[FRAUD SCORE] User ${userId}: ${score} points (${riskLevel} risk)`);
    
    return {
        score,
        riskLevel,
        reasons,
        blocked: score >= 50
    };
};

/**
 * Cleanup function to run periodically
 */
const cleanup = () => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    // Cleanup old entries
    for (const [key, value] of recentTransactions.entries()) {
        if (now - value > maxAge) {
            recentTransactions.delete(key);
        }
    }
    
    for (const [ip, data] of suspiciousIPs.entries()) {
        if (now - data.lastDetection > maxAge) {
            suspiciousIPs.delete(ip);
        }
    }
    
    for (const [ip, data] of cardTestingAttempts.entries()) {
        if (now - data.firstAttempt > maxAge) {
            cardTestingAttempts.delete(ip);
        }
    }
};

// Run cleanup every 10 minutes
setInterval(cleanup, 10 * 60 * 1000);

module.exports = {
    generateTransactionId,
    isDuplicateTransaction,
    detectCardTesting,
    checkVelocity,
    validateTransactionAmount,
    analyzeDeviceFingerprint,
    checkPromoCodeAbuse,
    calculateFraudScore,
    isSuspiciousIP,
    markIPSuspicious
};
