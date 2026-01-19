const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SECURITY: 'SECURITY'
};

/**
 * Mask sensitive data in logs
 */
const maskSensitiveData = (data) => {
    const sensitiveFields = ['password', 'password_hash', 'card_number', 'cvv', 'ssn'];
    const masked = { ...data };

    for (const field of sensitiveFields) {
        if (masked[field]) {
            masked[field] = '***REDACTED***';
        }
    }

    return masked;
};

/**
 * Write log to file
 */
const writeLog = (level, message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    const maskedMetadata = maskSensitiveData(metadata);

    const logEntry = {
        timestamp,
        level,
        message,
        metadata: maskedMetadata
    };

    const logLine = JSON.stringify(logEntry) + '\n';


    let logFile = 'app.log';
    if (level === LOG_LEVELS.SECURITY) {
        logFile = 'security.log';
    } else if (level === LOG_LEVELS.ERROR) {
        logFile = 'error.log';
    }

    const logPath = path.join(logsDir, logFile);

    fs.appendFile(logPath, logLine, (err) => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });

   
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${level}] ${message}`, maskedMetadata);
    }
};


const logger = {
    info: (message, metadata = {}) => {
        writeLog(LOG_LEVELS.INFO, message, metadata);
    },

    warn: (message, metadata = {}) => {
        writeLog(LOG_LEVELS.WARN, message, metadata);
    },

    error: (message, metadata = {}) => {
        writeLog(LOG_LEVELS.ERROR, message, metadata);
    },

    security: (message, metadata = {}) => {
        writeLog(LOG_LEVELS.SECURITY, message, metadata);
    },

    
    logAuth: (event, userId, success, metadata = {}) => {
        writeLog(LOG_LEVELS.SECURITY, `Auth Event: ${event}`, {
            userId,
            success,
            ...metadata
        });
    },

    logPayment: (event, userId, amount, metadata = {}) => {
        writeLog(LOG_LEVELS.SECURITY, `Payment Event: ${event}`, {
            userId,
            amount,
            ...metadata
        });
    },

    logOrderEvent: (event, orderId, userId, metadata = {}) => {
        writeLog(LOG_LEVELS.INFO, `Order Event: ${event}`, {
            orderId,
            userId,
            ...metadata
        });
    },

    logAdminAction: (action, adminId, targetId, metadata = {}) => {
        writeLog(LOG_LEVELS.SECURITY, `Admin Action: ${action}`, {
            adminId,
            targetId,
            ...metadata
        });
    }
};

module.exports = logger;
