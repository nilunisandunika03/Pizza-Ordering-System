import { createContext, useState, useEffect, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Validate MongoDB ObjectId format (24 hex characters)
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^[a-f\d]{24}$/i.test(id);
};

// Check if cart item has valid product ID
const isValidCartItem = (item) => {
    const productId = item._id || item.id;
    return productId && isValidObjectId(productId);
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                
                // Detect and remove stale/invalid cart data
                const hasStaleData = parsed.some(item => {
                    const productId = item._id || item.id;
                    // Check for numeric IDs, invalid ObjectId format, or missing IDs
                    return !productId || 
                           typeof productId === 'number' || 
                           !isNaN(productId) ||
                           !isValidObjectId(productId);
                });
                
                if (hasStaleData) {
                    console.warn('Stale cart data detected and cleared');
                    localStorage.removeItem('cartItems');
                    return [];
                }
                
                return parsed;
            } catch (error) {
                console.error('Failed to parse cart data:', error);
                localStorage.removeItem('cartItems');
                return [];
            }
        }
        return [];
    });

    useEffect(() => {
        // Validate all items before saving to localStorage
        const validItems = cartItems.filter(item => isValidCartItem(item));
        
        // If invalid items were filtered out, update state
        if (validItems.length !== cartItems.length) {
            console.warn('Invalid items removed from cart');
            setCartItems(validItems);
        }
        
        localStorage.setItem('cartItems', JSON.stringify(validItems));
    }, [cartItems]);

    const addToCart = (product) => {
        // Validate product has valid ID before adding
        if (!isValidCartItem(product)) {
            console.error('Cannot add invalid product to cart:', product);
            return;
        }
        
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item =>
                item.id === product.id &&
                item.selectedSize === product.selectedSize &&
                item.selectedCrust === product.selectedCrust
            );
            if (existingItem) {
                return prevItems.map(item =>
                    (item.id === product.id &&
                        item.selectedSize === product.selectedSize &&
                        item.selectedCrust === product.selectedCrust)
                        ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id, size, crust) => {
        setCartItems(prevItems => prevItems.filter(item =>
            !(item.id === id && item.selectedSize === size && item.selectedCrust === crust)
        ));
    };

    const updateQuantity = (id, size, crust, delta) => {
        setCartItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id && item.selectedSize === size && item.selectedCrust === crust) {
                    const newQuantity = item.quantity + delta;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
                }
                return item;
            });
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};
