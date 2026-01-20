const express = require('express');
const router = express.Router();
const Order = require('../database/models/Order');
const User = require('../database/models/User');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { adminOnly, userOnly } = require('../middleware/admin.middleware');
const { sendOrderConfirmation } = require('../utils/email');
const { validateOrder } = require('../utils/priceValidation');
const { checkPromoCodeAbuse } = require('../utils/fraudDetection');
const logger = require('../utils/logger');

// ==================== USER ROUTES (Customers Only) ====================

// Create a new order (USER ONLY - Admins cannot place orders)
router.post('/', userOnly, async (req, res) => {
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

        // Check active orders limit (max 5 active orders per user)
        const activeOrdersCount = await Order.countDocuments({
            customer: userId,
            status: { $nin: ['delivered', 'cancelled'] }
        });

        if (activeOrdersCount >= 5) {
            return res.status(400).json({
                message: 'You have reached the maximum limit of 5 active orders. Please wait for your existing orders to be delivered before placing new ones.',
                orderLimitReached: true,
                activeOrders: activeOrdersCount
            });
        }

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

// Get My Orders (USER ONLY)
router.get('/mine', userOnly, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.session.userId })
            .sort({ createdAt: -1 }); // Newest first
        res.json(orders);
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get Single Order Details (USER ONLY - Own orders only)
router.get('/:id', userOnly, async (req, res) => {
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

// ==================== ADMIN ROUTES (Admin Only) ====================
const { requireAdmin } = require('../middleware/admin.middleware');

// Get all orders (Admin only)
router.get('/admin/all', adminOnly, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .populate('customer', 'full_name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching all orders', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get admin dashboard stats
router.get('/admin/stats', adminOnly, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'confirmed' });
        const completedOrders = await Order.countDocuments({ status: 'delivered' });
        
        const revenueResult = await Order.aggregate([
            { $match: { payment_status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        const totalCustomers = await User.countDocuments({ role: 'customer' });

        const recentOrders = await Order.find()
            .populate('customer', 'full_name email')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue,
                totalCustomers
            },
            recentOrders
        });
    } catch (error) {
        logger.error('Error fetching admin stats', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch statistics' });
    }
});

// Update order status (Admin only)
router.patch('/:id/status', adminOnly, async (req, res) => {
    try {
        const { status, note } = req.body;

        if (!['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        order.status_history.push({
            status,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`
        });

        await order.save();

        logger.logAdminAction('order_status_updated', req.session.userId, order._id, {
            orderNumber: order.order_number,
            newStatus: status
        });

        res.json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        logger.error('Error updating order status', { error: error.message });
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

// Get single order details (Admin)
router.get('/admin/:id', adminOnly, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'full_name email phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ order });
    } catch (error) {
        logger.error('Error fetching order details', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch order details' });
    }
});

// Delete order (Admin only) - Use with caution
router.delete('/admin/:id', adminOnly, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Log deletion for audit trail
        logger.security('Order deleted by admin', {
            adminId: req.session.userId,
            orderId: order._id,
            orderNumber: order.order_number,
            customerId: order.customer,
            total: order.total,
            status: order.status
        });

        await Order.findByIdAndDelete(req.params.id);

        res.json({ 
            message: 'Order deleted successfully',
            deletedOrder: {
                id: order._id,
                order_number: order.order_number
            }
        });
    } catch (error) {
        logger.error('Error deleting order', { error: error.message, orderId: req.params.id });
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

// Create order manually (Admin only) - Optional feature for phone orders
router.post('/admin/create', adminOnly, async (req, res) => {
    try {
        const {
            customerId,
            items,
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            deliveryInfo,
            paymentMethod = 'cash',
            payment_status = 'pending',
            status = 'confirmed',
            note
        } = req.body;

        // Validate required fields
        if (!customerId || !items || items.length === 0 || !total) {
            return res.status(400).json({ message: 'Missing required fields: customerId, items, and total are required' });
        }

        // Verify customer exists
        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Validate product IDs
        const mongoose = require('mongoose');
        for (const item of items) {
            const pid = item._id || item.id;
            if (!mongoose.Types.ObjectId.isValid(pid)) {
                return res.status(400).json({ message: `Invalid product ID: ${pid}` });
            }
        }

        // Server-side price validation
        const priceValidation = await validateOrder({
            items,
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            deliveryInfo
        });

        if (!priceValidation.isValid) {
            logger.security('Admin order creation validation failed', {
                adminId: req.session.userId,
                customerId,
                errors: priceValidation.errors
            });
            return res.status(400).json({
                message: 'Order validation failed',
                errors: priceValidation.errors
            });
        }

        // Generate order number
        const orderCount = await Order.countDocuments();
        const order_number = `ORD${Date.now()}${orderCount + 1}`;

        // Create order
        const order = await Order.create({
            order_number,
            customer: customerId,
            items,
            subtotal,
            delivery_fee: deliveryFee,
            total,
            delivery_type: deliveryType,
            delivery_address: deliveryInfo?.address || '',
            contact_number: deliveryInfo?.contact1 || customer.phone || '',
            status,
            payment_status,
            payment_method: paymentMethod,
            status_history: [{
                status,
                timestamp: new Date(),
                note: note || `Order created manually by admin`
            }]
        });

        logger.info('Order created manually by admin', {
            adminId: req.session.userId,
            orderId: order._id,
            orderNumber: order.order_number,
            customerId,
            total
        });

        // Populate customer details for response
        await order.populate('customer', 'full_name email');

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        logger.error('Error creating admin order', { error: error.message, adminId: req.session.userId });
        res.status(500).json({ message: 'Failed to create order' });
    }
});

module.exports = router;
