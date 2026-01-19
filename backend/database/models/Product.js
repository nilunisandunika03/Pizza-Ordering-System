const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    base_price: {
        type: Number,
        required: true,
        min: 0
    },
    images: [{
        type: String
    }],

    sizes: [{
        name: {
            type: String,
            required: true,
            enum: ['Personal', 'Medium', 'Large']
        },
        price_modifier: {
            type: Number,
            default: 0
        }
    }],

  
    crusts: [{
        name: {
            type: String,
            required: true
        },
        price_modifier: {
            type: Number,
            default: 0
        }
    }],


    toppings: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        is_available: {
            type: Boolean,
            default: true
        }
    }],

 
    is_available: {
        type: Boolean,
        default: true
    },
    inventory_count: {
        type: Number,
        default: null // null means unlimited
    },

  
    is_vegetarian: {
        type: Boolean,
        default: false
    },
    is_vegan: {
        type: Boolean,
        default: false
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    spice_level: {
        type: String,
        enum: ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'],
        default: 'None'
    },

    // Nutritional info (optional)
    nutritional_info: {
        calories: Number,
        protein: Number,
        carbohydrates: Number,
        fat: Number
    },

    // Ratings & Reviews
    average_rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    review_count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
productSchema.index({ category: 1, is_available: 1 });
productSchema.index({ is_featured: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Method to calculate price with customizations
productSchema.methods.calculatePrice = function (size, crust, toppings = []) {
    let price = this.base_price;

    // Add size modifier
    if (size) {
        const selectedSize = this.sizes.find(s => s.name === size);
        if (selectedSize) {
            price += selectedSize.price_modifier;
        }
    }

    // Add crust modifier
    if (crust) {
        const selectedCrust = this.crusts.find(c => c.name === crust);
        if (selectedCrust) {
            price += selectedCrust.price_modifier;
        }
    }

    // Add toppings
    if (toppings && toppings.length > 0) {
        toppings.forEach(toppingName => {
            const topping = this.toppings.find(t => t.name === toppingName && t.is_available);
            if (topping) {
                price += topping.price;
            }
        });
    }

    return parseFloat(price.toFixed(2));
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
