const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Product = require('../database/models/Product');
const Category = require('../database/models/Category');
const { adminOnly } = require('../middleware/admin.middleware');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { apiRateLimiter } = require('../middleware/security.middleware');

// Rate limiter for search endpoint (stricter to prevent scraping)
const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 searches per 15 minutes
    message: { message: 'Too many search requests. Please try again later.' }
});

// ==================== PUBLIC ROUTES ====================

// Get all products with filtering and pagination
router.get('/', apiRateLimiter, [
    query('category').optional().isMongoId(),
    query('is_featured').optional().isBoolean(),
    query('is_vegetarian').optional().isBoolean(),
    query('is_vegan').optional().isBoolean(),
    query('search').optional().isString().trim().escape(), // XSS protection
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { category, is_featured, is_vegetarian, is_vegan, search, page = 1, limit = 12 } = req.query;

        // Build query
        const query = { is_available: true };

        if (category) query.category = category;
        if (is_featured !== undefined) query.is_featured = is_featured === 'true';
        if (is_vegetarian !== undefined) query.is_vegetarian = is_vegetarian === 'true';
        if (is_vegan !== undefined) query.is_vegan = is_vegan === 'true';

        // Text search with input sanitization (NoSQL injection prevention)
        if (search) {
            // Escape special regex characters to prevent ReDoS attacks
            const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$text = { $search: sanitizedSearch };
        }

        // Pagination
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .populate('category', 'name')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ is_featured: -1, createdAt: -1 })
            .select('-__v'); // Hide internal fields

        const total = await Product.countDocuments(query);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching products', { error: error.message });
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Get single product
router.get('/:id', apiRateLimiter, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .select('-__v');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ product });
    } catch (error) {
        logger.error('Error fetching product', { productId: req.params.id, error: error.message });
        res.status(500).json({ message: 'Error fetching product' });
    }
});

// Get products by category
router.get('/category/:categoryId', apiRateLimiter, async (req, res) => {
    try {
        const products = await Product.find({
            category: req.params.categoryId,
            is_available: true
        }).populate('category');

        res.json({ products });
    } catch (error) {
        logger.error('Error fetching products by category', { error: error.message });
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Get featured products
router.get('/featured/list', apiRateLimiter, async (req, res) => {
    try {
        const products = await Product.find({
            is_featured: true,
            is_available: true
        }).populate('category').limit(8);

        res.json({ products });
    } catch (error) {
        logger.error('Error fetching featured products', { error: error.message });
        res.status(500).json({ message: 'Error fetching featured products' });
    }
});

// ==================== ADMIN ROUTES ====================

// Create new product
router.post('/', adminOnly, [
    body('name').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('category').isMongoId(),
    body('base_price').isFloat({ min: 0 }),
    body('sizes').optional().isArray(),
    body('crusts').optional().isArray(),
    body('toppings').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.create(req.body);

        logger.logAdminAction('product_created', req.session.userId, product._id, {
            productName: product.name
        });

        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        logger.error('Error creating product', { error: error.message });
        res.status(500).json({ message: 'Error creating product' });
    }
});

// Update product
router.put('/:id', adminOnly, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        logger.logAdminAction('product_updated', req.session.userId, product._id, {
            productName: product.name
        });

        res.json({
            message: 'Product updated successfully',
            product
        });
    } catch (error) {
        logger.error('Error updating product', { error: error.message });
        res.status(500).json({ message: 'Error updating product' });
    }
});

// Delete product
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        logger.logAdminAction('product_deleted', req.session.userId, product._id, {
            productName: product.name
        });

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        logger.error('Error deleting product', { error: error.message });
        res.status(500).json({ message: 'Error deleting product' });
    }
});

module.exports = router;
