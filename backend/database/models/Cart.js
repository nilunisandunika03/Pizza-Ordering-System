const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    customization: {
        size: String,
        crust: String,
        toppings: [String],
        special_instructions: String
    },
    price_at_addition: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null for guest carts
    },
    session_id: {
        type: String,
        default: null // For guest users
    },
    items: [cartItemSchema],

    // Cart totals (calculated)
    subtotal: {
        type: Number,
        default: 0
    },
    delivery_fee: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },

    // Expiry for cleanup
    expires_at: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
}, {
    timestamps: true
});

// Index for efficient querying
cartSchema.index({ user: 1 });
cartSchema.index({ session_id: 1 });
cartSchema.index({ expires_at: 1 });

// Method to calculate cart totals
cartSchema.methods.calculateTotals = function () {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.price_at_addition * item.quantity);
    }, 0);

    // Delivery fee (Rs. 300, free delivery over Rs. 3000)
    this.delivery_fee = this.subtotal >= 3000 ? 0 : 300;

    // Calculate total
    this.total = this.subtotal + this.delivery_fee;

    // Round to 2 decimal places
    this.subtotal = parseFloat(this.subtotal.toFixed(2));
    this.total = parseFloat(this.total.toFixed(2));

    return this;
};

// Pre-save hook to calculate totals
cartSchema.pre('save', function (next) {
    this.calculateTotals();
    next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
