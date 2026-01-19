const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    product_snapshot: {
        name: String,
        description: String,
        image: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    customization: {
        size: String,
        crust: String,
        toppings: [String],
        special_instructions: String
    },
    unit_price: {
        type: Number,
        required: true
    },
    total_price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    order_number: {
        type: String,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Order items
    items: [orderItemSchema],

    // Pricing breakdown
    subtotal: {
        type: Number,
        required: true
    },
    delivery_fee: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },

    delivery_address: {
        no: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        province: { type: String, required: true },
        zip_code: { type: String, required: true },
        contact1: { type: String, required: true },
        contact2: { type: String, required: true }
    },

    // Order status
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Payment information
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    payment_method: {
        type: String,
        enum: ['card', 'cash', 'online'],
        default: 'card'
    },
    payment_intent_id: {
        type: String,
        default: null
    },

    // Delivery tracking
    estimated_delivery_time: {
        type: Date,
        default: null
    },
    actual_delivery_time: {
        type: Date,
        default: null
    },

    // Special instructions
    special_instructions: {
        type: String,
        default: ''
    },

    status_history: [{
        status: String,
        timestamp: Date,
        note: String
    }],


    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    review: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });



orderSchema.methods.updateStatus = function (newStatus, note = '') {
    this.status = newStatus;
    this.status_history.push({
        status: newStatus,
        timestamp: new Date(),
        note: note
    });


    if (newStatus === 'delivered' && !this.actual_delivery_time) {
        this.actual_delivery_time = new Date();
    }

    return this;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
