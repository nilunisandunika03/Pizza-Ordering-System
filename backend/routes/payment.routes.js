const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { userOnly } = require('../middleware/admin.middleware');
const { strictRateLimiter } = require('../middleware/security.middleware');
const {
    generateTransactionId,
    isDuplicateTransaction,
    detectCardTesting,
    validateTransactionAmount,
    calculateFraudScore,
    isSuspiciousIP
} = require('../utils/fraudDetection');
const User = require('../database/models/User');

/**
 * Enhanced Payment Processing with Fraud Detection
 * Implements multiple layers of security for payment transactions
 * USER ONLY - Admins cannot make payments
 */
router.post('/process', userOnly, strictRateLimiter, async (req, res) => {
    try {
        const { amount, paymentMethod, cardLast4, orderTotal, orderData } = req.body;
        const userId = req.session.userId;
        const ip = req.ip || req.connection.remoteAddress;

        // 1. Validate required fields
        if (!amount || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required payment information' });
        }

        // 2. Block suspicious IPs immediately
        if (isSuspiciousIP(ip)) {
            logger.security('Payment blocked from suspicious IP', { ip, userId });
            return res.status(403).json({ 
                message: 'Payment processing temporarily unavailable. Please contact support.',
                errorCode: 'SECURITY_BLOCK'
            });
        }

        // 3. Check for duplicate/replay transactions
        const transactionId = generateTransactionId(userId, amount, Date.now());
        if (isDuplicateTransaction(transactionId)) {
            logger.security('Duplicate transaction attempt detected', { userId, amount, transactionId });
            return res.status(409).json({ 
                message: 'This transaction has already been processed',
                errorCode: 'DUPLICATE_TRANSACTION'
            });
        }

        // 4. Validate transaction amount
        const amountValidation = validateTransactionAmount(amount, orderTotal || amount);
        if (!amountValidation.valid) {
            logger.security('Invalid transaction amount', { userId, amount, reason: amountValidation.reason });
            return res.status(400).json({ 
                message: amountValidation.reason,
                errorCode: 'INVALID_AMOUNT'
            });
        }

        // 5. Card testing detection
        if (cardLast4 && detectCardTesting(ip, cardLast4)) {
            logger.security('Card testing detected', { ip, cardLast4 });
            return res.status(403).json({ 
                message: 'Too many card attempts. Please try again later.',
                errorCode: 'CARD_TESTING_DETECTED'
            });
        }

        // 6. Get user info for fraud scoring
        const user = await User.findById(userId);
        const accountAge = Date.now() - new Date(user.createdAt).getTime();
        const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours

        // 7. Calculate fraud score
        const fraudAnalysis = calculateFraudScore(req, userId, amount, { 
            isNewAccount,
            ...orderData 
        });

        // 8. Block high-risk transactions
        if (fraudAnalysis.blocked) {
            logger.security('Transaction blocked due to high fraud score', {
                userId,
                ip,
                score: fraudAnalysis.score,
                reasons: fraudAnalysis.reasons
            });
            return res.status(403).json({
                message: 'Transaction could not be processed. Please contact support.',
                errorCode: 'FRAUD_DETECTED',
                referenceId: transactionId.substring(0, 8)
            });
        }

        // 9. Log medium-risk transactions for manual review
        if (fraudAnalysis.riskLevel === 'medium') {
            logger.warn('Medium-risk transaction', {
                userId,
                amount,
                score: fraudAnalysis.score,
                reasons: fraudAnalysis.reasons
            });
        }

        // 10. Process payment (mock for prototype)
        logger.info('Processing payment', { 
            userId, 
            amount, 
            paymentMethod,
            riskLevel: fraudAnalysis.riskLevel,
            fraudScore: fraudAnalysis.score
        });

        // Simulate successful payment
        const finalTransactionId = 'txn_' + Math.random().toString(36).substr(2, 12);

        res.json({
            success: true,
            message: 'Payment processed successfully',
            transactionId: finalTransactionId,
            riskLevel: fraudAnalysis.riskLevel,
            amount: amount
        });

    } catch (error) {
        logger.error('Error processing payment', { error: error.message, stack: error.stack });
        res.status(500).json({ 
            message: 'Payment processing error. Please try again.',
            errorCode: 'PROCESSING_ERROR'
        });
    }
});

/**
 * Verify payment status (for 3D Secure callbacks)
 */
router.get('/verify/:transactionId', isAuthenticated, async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        // Mock verification - in production, verify with payment gateway
        logger.info('Verifying payment status', { transactionId });

        res.json({
            verified: true,
            status: 'completed',
            transactionId
        });

    } catch (error) {
        logger.error('Error verifying payment', { error: error.message });
        res.status(500).json({ message: 'Verification error' });
    }
});

module.exports = router;
