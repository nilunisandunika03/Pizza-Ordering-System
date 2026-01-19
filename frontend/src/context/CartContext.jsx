import { createContext, useState, useEffect, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
        
            const hasStaleData = parsed.some(item => typeof item.id === 'number' || !isNaN(item.id));
            if (hasStaleData) {
                localStorage.removeItem('cartItems');
                return [];
            }
            return parsed;
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product) => {
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
