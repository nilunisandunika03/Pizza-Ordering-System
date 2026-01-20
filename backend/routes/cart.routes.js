const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Cart = require('../database/models/Cart');
const Product = require('../database/models/Product');
const { calculateProductPrice } = require('../utils/priceCalculator');
const logger = require('../utils/logger');
const { userOnly } = require('../middleware/admin.middleware');


const getOrCreateCart = async (req) => {
    let cart;

    if (req.session.userId) {

        cart = await Cart.findOne({ user: req.session.userId });
        if (!cart) {
            cart = await Cart.create({ user: req.session.userId });
        }
    } else {

        if (!req.session.cartSessionId) {
            req.session.cartSessionId = require('crypto').randomBytes(16).toString('hex');
        }

        cart = await Cart.findOne({ session_id: req.session.cartSessionId });
        if (!cart) {
            cart = await Cart.create({ session_id: req.session.cartSessionId });
        }
    }

    return cart;
};

// ==================== CART ROUTES (USER ONLY) ====================
// Admin users should not use cart functionality

router.get('/', userOnly, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req);
        await cart.populate('items.product');

        res.json({ cart });
    } catch (error) {
        logger.error('Error fetching cart', { error: error.message });
        res.status(500).json({ message: 'Error fetching cart' });
    }
});

// Add item to cart
router.post('/items', userOnly, [
    body('productId').isMongoId(),
    body('quantity').isInt({ min: 1 }),
    body('customization').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, customization } = req.body;

        // Get product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (!product.is_available) {
            return res.status(400).json({ message: 'Product is not available' });
        }

        // Calculate price with customizations
        const price = calculateProductPrice(product, customization);

        // Get or create cart
        const cart = await getOrCreateCart(req);

        // Check if item already exists in cart with same customization
        const existingItemIndex = cart.items.findIndex(item =>
            item.product.toString() === productId &&
            JSON.stringify(item.customization) === JSON.stringify(customization)
        );

        if (existingItemIndex !== -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                customization,
                price_at_addition: price
            });
        }

        await cart.save();
        await cart.populate('items.product');

        logger.info('Item added to cart', {
            userId: req.session.userId || 'guest',
            productId,
            quantity
        });

        res.json({
            message: 'Item added to cart',
            cart
        });
    } catch (error) {
        logger.error('Error adding item to cart', { error: error.message });
        res.status(500).json({ message: 'Error adding item to cart' });
    }
});

// Update cart item
router.put('/items/:itemId', userOnly, [
    body('quantity').optional().isInt({ min: 1 }),
    body('customization').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { quantity, customization } = req.body;
        const cart = await getOrCreateCart(req);

        const item = cart.items.id(req.params.itemId);
        if (!item) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        // Update quantity
        if (quantity !== undefined) {
            item.quantity = quantity;
        }

        // Update customization and recalculate price
        if (customization !== undefined) {
            const product = await Product.findById(item.product);
            item.customization = customization;
            item.price_at_addition = calculateProductPrice(product, customization);
        }

        await cart.save();
        await cart.populate('items.product');

        res.json({
            message: 'Cart item updated',
            cart
        });
    } catch (error) {
        logger.error('Error updating cart item', { error: error.message });
        res.status(500).json({ message: 'Error updating cart item' });
    }
});

// Remove item from cart
router.delete('/items/:itemId', userOnly, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req);

        // Remove item using pull
        cart.items.pull(req.params.itemId);

        await cart.save();
        await cart.populate('items.product');

        res.json({
            message: 'Item removed from cart',
            cart
        });
    } catch (error) {
        logger.error('Error removing cart item', { error: error.message });
        res.status(500).json({ message: 'Error removing cart item' });
    }
});

// Clear cart
router.delete('/', userOnly, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req);

        cart.items = [];

        await cart.save();

        res.json({
            message: 'Cart cleared',
            cart
        });
    } catch (error) {
        logger.error('Error clearing cart', { error: error.message });
        res.status(500).json({ message: 'Error clearing cart' });
    }
});


module.exports = router;
