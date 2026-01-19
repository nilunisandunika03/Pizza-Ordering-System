/**
 * Environment Validation Utility
 * Validates required environment variables on startup
 */

const crypto = require('crypto');

// Define required environment variables by category
const REQUIRED_ENV_VARS = {
    security: {
        SESSION_SECRET: 'Session secret key for cookie encryption',
        JWT_SECRET: 'JWT secret key for token signing'
    },
    database: {
        MONGO_URI: 'MongoDB connection string'
    },
    email: {
        EMAIL_HOST: 'SMTP server hostname',
        EMAIL_PORT: 'SMTP server port',
        EMAIL_USER: 'Email account username',
        EMAIL_PASS: 'Email account password'
    }
};

// Optional but recommended variables
const RECOMMENDED_ENV_VARS = {
    NODE_ENV: 'Application environment (development/production)',
    PORT: 'Server port number',
    CORS_ORIGIN: 'Allowed CORS origins',
    STRIPE_SECRET_KEY: 'Stripe secret key for payment processing',
    STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key',
    LOG_LEVEL: 'Logging level (error/warn/info/debug)'
};

/**
 * Validate required environment variables
 * @returns {Object} Validation result with status and missing variables
 */
function validateEnvironment() {
    const missing = [];
    const weak = [];
    const warnings = [];

    // Check required variables
    for (const [category, vars] of Object.entries(REQUIRED_ENV_VARS)) {
        for (const [varName, description] of Object.entries(vars)) {
            if (!process.env[varName]) {
                missing.push({ 
                    name: varName, 
                    description, 
                    category 
                });
            } else {
                // Check for weak/default secrets
                if (varName.includes('SECRET') || varName.includes('KEY')) {
                    const value = process.env[varName];
                    if (value.length < 32) {
                        weak.push({
                            name: varName,
                            reason: 'Secret is too short (minimum 32 characters recommended)',
                            category
                        });
                    }
                    if (value.toLowerCase().includes('change') || 
                        value.toLowerCase().includes('example') ||
                        value.toLowerCase().includes('your-')) {
                        weak.push({
                            name: varName,
                            reason: 'Secret appears to be a placeholder or example value',
                            category
                        });
                    }
                }
            }
        }
    }

    // Check recommended variables
    for (const [varName, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
        if (!process.env[varName]) {
            warnings.push({ 
                name: varName, 
                description 
            });
        }
    }

    return {
        isValid: missing.length === 0 && weak.length === 0,
        missing,
        weak,
        warnings
    };
}

/**
 * Generate a secure random secret
 * @param {number} length - Length in bytes (default 64)
 * @returns {string} Hex-encoded random string
 */
function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Print validation results to console with formatting
 */
function printValidationResults(validation) {
    console.log('\n========================================');
    console.log('ENVIRONMENT VALIDATION');
    console.log('========================================\n');

    if (validation.isValid && validation.warnings.length === 0) {
        console.log('✅ All environment variables are properly configured!\n');
        return;
    }

    // Print missing variables
    if (validation.missing.length > 0) {
        console.error('❌ MISSING REQUIRED VARIABLES:\n');
        validation.missing.forEach(({ name, description, category }) => {
            console.error(`   ${name} (${category})`);
            console.error(`      → ${description}\n`);
        });
    }

    // Print weak secrets
    if (validation.weak.length > 0) {
        console.error('⚠️  WEAK OR INSECURE SECRETS:\n');
        validation.weak.forEach(({ name, reason, category }) => {
            console.error(`   ${name} (${category})`);
            console.error(`      → ${reason}\n`);
        });
        console.error('   Generate secure secrets with:');
        console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    }

    // Print warnings
    if (validation.warnings.length > 0) {
        console.warn('⚠️  RECOMMENDED VARIABLES (not set):\n');
        validation.warnings.forEach(({ name, description }) => {
            console.warn(`   ${name}`);
            console.warn(`      → ${description}\n`);
        });
    }

    console.log('========================================');
    console.log('SETUP INSTRUCTIONS:');
    console.log('========================================\n');
    console.log('1. Copy backend/.env.example to backend/.env');
    console.log('2. Fill in all required values');
    console.log('3. Generate secure secrets using:');
    console.log('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.log('4. Never commit .env file to version control\n');
}

/**
 * Validate and exit if environment is invalid
 * @param {boolean} exitOnError - Whether to exit process on validation failure
 */
function validateOrExit(exitOnError = true) {
    const validation = validateEnvironment();
    printValidationResults(validation);

    if (!validation.isValid) {
        if (exitOnError) {
            console.error('\n❌ FATAL: Cannot start server with invalid environment configuration.\n');
            process.exit(1);
        }
        return false;
    }

    // Print warnings but don't exit
    if (validation.warnings.length > 0) {
        console.warn('⚠️  Server starting with some recommended variables missing.\n');
    }

    return true;
}

/**
 * Check production readiness
 */
function checkProductionReadiness() {
    if (process.env.NODE_ENV !== 'production') {
        return { ready: true };
    }

    const issues = [];

    // Check for development defaults
    if (process.env.PORT === '3001') {
        issues.push('Using default development port (3001)');
    }

    if (process.env.CORS_ORIGIN?.includes('localhost')) {
        issues.push('CORS_ORIGIN includes localhost - should be production domain');
    }

    if (process.env.MONGO_URI?.includes('localhost')) {
        issues.push('Using local MongoDB - should use production database');
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('test')) {
        issues.push('Using Stripe test keys - switch to live keys for production');
    }

    if (!process.env.SSL_ENABLED || process.env.SSL_ENABLED !== 'true') {
        issues.push('SSL not enabled - HTTPS is required for production');
    }

    if (process.env.DEBUG === 'true') {
        issues.push('Debug mode is enabled - should be disabled in production');
    }

    if (process.env.DISABLE_CSRF === 'true') {
        issues.push('CSRF protection is disabled - MUST be enabled in production');
    }

    if (issues.length > 0) {
        console.warn('\n⚠️  PRODUCTION READINESS ISSUES:\n');
        issues.forEach(issue => console.warn(`   - ${issue}`));
        console.warn('');
        return { ready: false, issues };
    }

    return { ready: true };
}

module.exports = {
    validateEnvironment,
    validateOrExit,
    generateSecret,
    printValidationResults,
    checkProductionReadiness,
    REQUIRED_ENV_VARS,
    RECOMMENDED_ENV_VARS
};
