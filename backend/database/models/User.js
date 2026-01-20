const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password_hash: {
        type: String,
        required: true
    },
    full_name: {
        type: String,
        required: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    verification_token: {
        type: String,
        default: null
    },
    verification_token_expires: {
        type: Date,
        default: null
    },
    mfa_secret: {
        type: String,
        default: null
    },
    mfa_secret_expires: {
        type: Date,
        default: null
    },
    mfa_enabled: {
        type: Boolean,
        default: false
    },
    last_login: {
        type: Date,
        default: null
    },
    address: {
        no: { type: String, default: null },
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        zip_code: { type: String, default: null }
    },
    failed_login_attempts: {
        type: Number,
        default: 0
    },
    lock_until: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    is_blocked: {
        type: Boolean,
        default: false
    },
    blocked_reason: {
        type: String,
        default: null
    },
    blocked_at: {
        type: Date,
        default: null
    },
    blocked_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    savedCards: [{
        last4: String,
        brand: String, // e.g., 'Visa', 'MasterCard'
        expiry: String,
        token: String, // In a real app, this is a PCIDSS token from Stripe/etc.
        cardHolder: String
    }],
    // Password Reset Fields
    password_reset_token: {
        type: String,
        default: null
    },
    password_reset_expires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Hash password before saving if it's new or modified
userSchema.pre('save', async function () {
    if (!this.isModified('password_hash')) return;
    this.password_hash = await argon2.hash(this.password_hash, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1
    });
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await argon2.verify(this.password_hash, candidatePassword);
};

// --- New Account Restriction Methods ---

/**
 * Get account age in milliseconds
 */
userSchema.virtual('accountAge').get(function () {
    return Date.now() - this.createdAt.getTime();
});

/**
 * Check if account can place orders (must wait 24 hours)
 * @returns {boolean} - true if allowed, false if too new
 */
userSchema.methods.canPlaceOrder = function () {
    const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    return this.accountAge >= MIN_ACCOUNT_AGE_MS;
};

/**
 * Check if account can leave reviews (must wait 24 hours)
 * @returns {boolean} - true if allowed, false if too new
 */
userSchema.methods.canLeaveReview = function () {
    const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    return this.accountAge >= MIN_ACCOUNT_AGE_MS;
};

/**
 * Get time remaining until account can perform restricted actions
 * @returns {number} - Time remaining in minutes
 */
userSchema.methods.getTimeUntilUnrestricted = function () {
    const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const timeRemaining = MIN_ACCOUNT_AGE_MS - this.accountAge;
    return Math.max(0, Math.ceil(timeRemaining / 1000 / 60)); // Convert to minutes
};

const User = mongoose.model('User', userSchema);

module.exports = User;
