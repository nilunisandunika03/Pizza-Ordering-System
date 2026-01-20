/**
 * Price Validation Utility
 * Server-side validation to prevent cart tampering and price manipulation
 */

const Product = require('../database/models/Product');

/**
 * Validate cart item prices against database
 * Prevents client-side price manipulation
 */
const validateCartPrices = async (cartItems) => {
    const validationErrors = [];
    let validatedTotal = 0;

    for (const item of cartItems) {
        try {
            // Fetch current product price from database
            const product = await Product.findById(item._id || item.id);

            if (!product) {
                validationErrors.push({
                    productId: item._id || item.id,
                    error: 'Product not found'
                });
                continue;
            }

            if (!product.is_available) {
                validationErrors.push({
                    productId: item._id || item.id,
                    productName: item.name,
                    error: 'Product is no longer available'
                });
                continue;
            }

            // Calculate actual price based on current database values
            let actualPrice = product.base_price;

            // Add size modifier
            if (item.selectedSize && product.sizes) {
                const size = product.sizes.find(s => s.name === item.selectedSize);
                if (size) {
                    actualPrice += size.price_modifier;
                }
            }

            // Add crust modifier
            if (item.selectedCrust && product.crusts) {
                const crust = product.crusts.find(c => c.name === item.selectedCrust);
                if (crust) {
                    actualPrice += crust.price_modifier;
                }
            }

            // Validate against client-submitted price
            const clientPrice = parseFloat(item.price);
            const tolerance = 0.01; // Allow 1 cent difference for rounding

            if (Math.abs(clientPrice - actualPrice) > tolerance) {
                validationErrors.push({
                    productId: item._id || item.id,
                    productName: item.name,
                    error: 'Price mismatch detected',
                    clientPrice: clientPrice,
                    actualPrice: actualPrice,
                    difference: Math.abs(clientPrice - actualPrice)
                });
                
                console.log(`[SECURITY] Price tampering detected: ${item.name}`);
                console.log(`  Client Price: $${clientPrice}`);
                console.log(`  Actual Price: $${actualPrice}`);
                
                // Use actual price for calculation
                validatedTotal += actualPrice * item.quantity;
            } else {
                validatedTotal += actualPrice * item.quantity;
            }

        } catch (error) {
            validationErrors.push({
                productId: item._id || item.id,
                error: 'Validation error: ' + error.message
            });
        }
    }

    return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        validatedTotal: parseFloat(validatedTotal.toFixed(2))
    };
};

/**
 * Validate order total
 * Ensures subtotal + delivery fee = total
 */
const validateOrderTotal = (subtotal, deliveryFee, total, deliveryType) => {
    const expectedTotal = parseFloat(subtotal) + parseFloat(deliveryFee);
    const clientTotal = parseFloat(total);
    const tolerance = 0.01;

    // Validate delivery fee based on delivery type (Rs. 300 for delivery in Sri Lanka)
    const expectedDeliveryFee = deliveryType === 'delivery' ? 300.00 : 0.00;
    if (Math.abs(deliveryFee - expectedDeliveryFee) > tolerance) {
        console.log('[SECURITY] Delivery fee tampering detected');
        return {
            isValid: false,
            error: 'Invalid delivery fee',
            expected: expectedDeliveryFee,
            received: deliveryFee
        };
    }

    if (Math.abs(clientTotal - expectedTotal) > tolerance) {
        console.log('[SECURITY] Order total tampering detected');
        return {
            isValid: false,
            error: 'Order total does not match calculation',
            expected: expectedTotal,
            received: clientTotal
        };
    }

    return {
        isValid: true,
        validatedTotal: expectedTotal
    };
};

/**
 * Validate discount/promo codes
 * Prevents abuse of promotional codes
 */
const validatePromoCode = async (promoCode, subtotal, userId) => {
    // Mock promo code validation - replace with actual database lookup
    const validPromoCodes = {
        'WELCOME10': { discount: 0.10, minOrder: 20, maxDiscount: 10, oneTimeUse: true },
        'PIZZA20': { discount: 0.20, minOrder: 30, maxDiscount: 15, oneTimeUse: false }
    };

    const promo = validPromoCodes[promoCode];

    if (!promo) {
        return {
            isValid: false,
            error: 'Invalid promo code'
        };
    }

    if (subtotal < promo.minOrder) {
        return {
            isValid: false,
            error: `Minimum order of $${promo.minOrder} required for this promo code`
        };
    }

    let discountAmount = subtotal * promo.discount;
    if (discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
    }

    return {
        isValid: true,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        discountPercent: promo.discount * 100
    };
};

/**
 * Comprehensive order validation
 * Validates all aspects of an order before processing
 */
const validateOrder = async (orderData) => {
    const errors = [];
    
    // Validate cart items and prices
    const priceValidation = await validateCartPrices(orderData.items);
    if (!priceValidation.isValid) {
        errors.push(...priceValidation.errors);
    }

    // Validate order total
    const totalValidation = validateOrderTotal(
        orderData.subtotal,
        orderData.deliveryFee,
        orderData.total,
        orderData.deliveryType
    );
    if (!totalValidation.isValid) {
        errors.push(totalValidation);
    }

    // Validate delivery information
    if (orderData.deliveryType === 'delivery') {
        if (!orderData.deliveryInfo || !orderData.deliveryInfo.street || !orderData.deliveryInfo.city) {
            errors.push({ error: 'Incomplete delivery information' });
        }
    }

    // Validate payment information
    if (!orderData.paymentInfo) {
        errors.push({ error: 'Missing payment information' });
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        validatedSubtotal: priceValidation.validatedTotal,
        validatedTotal: totalValidation.validatedTotal
    };
};

module.exports = {
    validateCartPrices,
    validateOrderTotal,
    validatePromoCode,
    validateOrder
};
