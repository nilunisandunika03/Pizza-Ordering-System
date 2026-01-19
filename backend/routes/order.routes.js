const express = require('express');
const router = express.Router();
const Order = require('../database/models/Order');
const User = require('../database/models/User');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { sendOrderConfirmation } = require('../utils/email');
const { validateOrder } = require('../utils/priceValidation');
const { checkPromoCodeAbuse } = require('../utils/fraudDetection');
const logger = require('../utils/logger');

// Create a new order
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const {
            items,
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            deliveryInfo, // { address, contact1, contact2 }
            paymentInfo, // { last4, brand, expiry, saveCard }
            paymentMethod = 'card',
            promoCode
        } = req.body;

        const userId = req.session.userId;
        const ip = req.ip || req.connection.remoteAddress;

        // 0. Validate product IDs (prevent BSON errors from stale cart)
        const mongoose = require('mongoose');
        for (const item of items) {
            const pid = item._id || item.id;
            if (!mongoose.Types.ObjectId.isValid(pid)) {
                return res.status(400).json({
                    message: `Invalid product ID: ${pid}. Your cart might contain old data. Please clear your cart and try again.`,
                    staleCart: true
                });
            }
        }

        // 0.1. SERVER-SIDE PRICE VALIDATION (Critical Security Control)
        const priceValidation = await validateOrder({
            items,
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            deliveryInfo,
            paymentInfo
        });

        if (!priceValidation.isValid) {
            logger.security('Order validation failed - possible tampering', {
                userId,
                ip,
                errors: priceValidation.errors
            });
            return res.status(400).json({
                message: 'Order validation failed. Prices may have changed or there was an error.',
                errors: priceValidation.errors,
                validationFailed: true
            });
        }

        // 0.2. Promo code abuse detection
        if (promoCode) {
            const promoCheck = checkPromoCodeAbuse(userId, ip, promoCode);
            if (promoCheck.abused) {
                logger.security('Promo code abuse detected', { userId, ip, promoCode });
                return res.status(403).json({
                    message: promoCheck.reason,
                    promoAbuse: true
                });
            }
        }

        // 1. Create the Order
        const newOrder = new Order({
            customer: userId,
            items: items.map(item => ({
                product: item._id || item.id,
                product_snapshot: {
                    name: item.name,
                    description: item.description,
                    image: item.image
                },
                quantity: item.quantity,
                customization: {
                    size: item.selectedSize,
                    crust: item.selectedCrust
                },
                unit_price: item.price,
                total_price: item.price * item.quantity
            })),
            subtotal,
            delivery_fee: deliveryFee,
            total,
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: paymentMethod,
            delivery_address: deliveryType === 'delivery' ? {
                no: deliveryInfo.no,
                street: deliveryInfo.street,
                city: deliveryInfo.city,
                province: deliveryInfo.province,
                zip_code: deliveryInfo.zipCode,
                contact1: deliveryInfo.contact1,
                contact2: deliveryInfo.contact2
            } : undefined
        });

        // Generate unique order number: ORD-YYYYMMDD-XXXX
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);
        newOrder.order_number = `ORD-${dateStr}-${random}`;

        // Set estimated delivery time
        newOrder.estimated_delivery_time = new Date(Date.now() + 45 * 60 * 1000);

        // Initial status history
        newOrder.status_history = [{
            status: newOrder.status,
            timestamp: new Date(),
            note: 'Order created'
        }];


        if (deliveryType === 'takeaway') {

            newOrder.delivery_address = {
                no: 'N/A',
                street: 'Takeaway (Pick up at Store)',
                city: 'N/A',
                province: 'N/A',
                zip_code: 'N/A',
                contact1: 'N/A',
                contact2: 'N/A'
            };
        }

        await newOrder.save();

        // 2. Save Card if requested
        if (paymentInfo && paymentInfo.saveCard) {
            const user = await User.findById(userId);
            // Check if card already exists (simple check by last4)
            const cardExists = user.savedCards.some(c => c.last4 === paymentInfo.last4);
            if (!cardExists) {
                user.savedCards.push({
                    last4: paymentInfo.last4,
                    brand: paymentInfo.brand || 'Visa',
                    expiry: paymentInfo.expiry,
                    cardHolder: paymentInfo.cardHolder,
                    token: 'tok_' + Math.random().toString(36).substr(2, 9) // Mock token
                });
                await user.save();
            }
        }

        // 3. Send Email
        // await sendOrderConfirmation(req.user.email, newOrder); // req.user isn't populated by default in my middleware, use User find
        const user = await User.findById(userId);
        if (user) {
            // await sendOrderConfirmation(user.email, newOrder); 
            // Commented out to avoid crashing if email utils fail in dev without ethereal
        }

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder._id,
            orderNumber: newOrder.order_number
        });

    } catch (error) {
        console.error('Order Creation Error:', error);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`Validation Error [${key}]:`, error.errors[key].message);
            });
        }
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
});

// Get My Orders
router.get('/mine', isAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.session.userId })
            .sort({ createdAt: -1 }); // Newest first
        res.json(orders);
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get Single Order Details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            customer: req.session.userId
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get Order Details Error:', error);
        res.status(500).json({ message: 'Failed to fetch order details' });
    }
});

module.exports = router;
