/**
 * IP-based Registration Tracker
 * Prevents mass fake account creation from the same IP address
 */

const RegistrationIP = new Map();

// Configuration
const MAX_ACCOUNTS_PER_IP_PER_DAY = 5; // Limit: 5 accounts per IP per 24 hours
const TRACKING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if an IP has exceeded the daily registration limit
 * @param {string} ip - Client IP address
 * @returns {boolean} - true if allowed, false if limit exceeded
 */
const checkIPRegistrationLimit = (ip) => {
    const now = Date.now();
    const ipData = RegistrationIP.get(ip);

    // First registration from this IP
    if (!ipData) {
        RegistrationIP.set(ip, {
            count: 1,
            firstRegistration: now,
            lastRegistration: now
        });
        return true;
    }

    // Check if tracking window has expired (reset counter)
    if (now - ipData.firstRegistration > TRACKING_WINDOW_MS) {
        RegistrationIP.set(ip, {
            count: 1,
            firstRegistration: now,
            lastRegistration: now
        });
        return true;
    }

    // Check if limit exceeded
    if (ipData.count >= MAX_ACCOUNTS_PER_IP_PER_DAY) {
        return false;
    }

    // Increment counter
    ipData.count++;
    ipData.lastRegistration = now;
    RegistrationIP.set(ip, ipData);
    return true;
};

/**
 * Get registration stats for an IP (for admin monitoring)
 * @param {string} ip - Client IP address
 * @returns {object} - Registration statistics
 */
const getIPStats = (ip) => {
    const ipData = RegistrationIP.get(ip);
    if (!ipData) {
        return { count: 0, status: 'new' };
    }

    const now = Date.now();
    const timeRemaining = TRACKING_WINDOW_MS - (now - ipData.firstRegistration);
    
    return {
        count: ipData.count,
        limit: MAX_ACCOUNTS_PER_IP_PER_DAY,
        resetIn: Math.max(0, Math.ceil(timeRemaining / 1000 / 60)), // minutes
        status: ipData.count >= MAX_ACCOUNTS_PER_IP_PER_DAY ? 'blocked' : 'active'
    };
};

/**
 * Clean up old IP records (optional - run periodically)
 */
const cleanupOldRecords = () => {
    const now = Date.now();
    for (const [ip, data] of RegistrationIP.entries()) {
        if (now - data.firstRegistration > TRACKING_WINDOW_MS) {
            RegistrationIP.delete(ip);
        }
    }
};

// Run cleanup every hour
setInterval(cleanupOldRecords, 60 * 60 * 1000);

module.exports = {
    checkIPRegistrationLimit,
    getIPStats,
    MAX_ACCOUNTS_PER_IP_PER_DAY,
    TRACKING_WINDOW_MS
};
