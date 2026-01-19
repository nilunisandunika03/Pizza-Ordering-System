const express = require('express');
const router = express.Router();
const Category = require('../database/models/Category');
const logger = require('../utils/logger');

// Get all active categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({ is_active: true })
            .sort({ display_order: 1 });
        res.json({ categories });
    } catch (error) {
        logger.error('Error fetching categories', { error: error.message });
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

// Get single category
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ category });
    } catch (error) {
        logger.error('Error fetching category', { categoryId: req.params.id, error: error.message });
        res.status(500).json({ message: 'Error fetching category' });
    }
});

module.exports = router;
