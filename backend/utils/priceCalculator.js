/**
 * Calculate prices for products with customizations
 */
const calculateProductPrice = (product, customization = {}) => {
    let price = product.base_price;


    if (customization.size) {
        const selectedSize = product.sizes.find(s => s.name === customization.size);
        if (selectedSize) {
            price += selectedSize.price_modifier;
        }
    }


    if (customization.crust) {
        const selectedCrust = product.crusts.find(c => c.name === customization.crust);
        if (selectedCrust) {
            price += selectedCrust.price_modifier;
        }
    }


    if (customization.toppings && customization.toppings.length > 0) {
        customization.toppings.forEach(toppingName => {
            const topping = product.toppings.find(t => t.name === toppingName && t.is_available);
            if (topping) {
                price += topping.price;
            }
        });
    }

    return parseFloat(price.toFixed(2));
};

const calculateCartTotals = (items) => {

    const subtotal = items.reduce((sum, item) => {
        return sum + (item.price_at_addition * item.quantity);
    }, 0);

    // Delivery fee (Rs. 300, free over Rs. 3000)
    const FREE_DELIVERY_THRESHOLD = 3000;
    const DELIVERY_FEE = 300;
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

    // Calculate total
    const total = subtotal + deliveryFee;

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        deliveryFee: parseFloat(deliveryFee.toFixed(2)),
        total: parseFloat(total.toFixed(2))
    };
};

/**
 * Calculate order totals (similar to cart but for order creation)
 */
const calculateOrderTotals = (items) => {
    return calculateCartTotals(items);
};

module.exports = {
    calculateProductPrice,
    calculateCartTotals,
    calculateOrderTotals
};
