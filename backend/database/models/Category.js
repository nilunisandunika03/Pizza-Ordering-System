const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    image_url: {
        type: String,
        default: null
    },
    icon: {
        type: String,
        default: null
    },
    display_order: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
categorySchema.index({ is_active: 1, display_order: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
