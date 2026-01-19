import { Link, useNavigate } from 'react-router-dom';
import { Trash, Plus, Minus, ArrowRight } from 'phosphor-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Cart.css';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleCheckout = () => {
        if (user) {
            navigate('/checkout');
        } else {
            navigate('/login', { state: { from: { pathname: '/checkout' } } });
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="cart-page empty-state">
                <div className="container">
                    <h2>Your Cart is Empty</h2>
                    <p>Looks like you haven't added any delicious pizzas yet.</p>
                    <Link to="/menu" className="btn btn-primary">Browse Menu</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="container">
                <h1>Your Cart</h1>

                <div className="cart-grid">
                    <div className="cart-items">
                        {cartItems.map(item => (
                            <div key={`${item.id}-${item.selectedSize}-${item.selectedCrust}`} className="cart-item">
                                <div className="item-image">
                                    <img src={item.image || (item.images && item.images[0]) || '/images/placeholder-pizza.png'} alt={item.name} />
                                </div>
                                <div className="item-details">
                                    <h3>{item.name}</h3>
                                    <p className="item-customization">
                                        {item.selectedSize} • {item.selectedCrust}
                                    </p>
                                    <div className="quantity-controls">
                                        <button onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedCrust, -1)} disabled={item.quantity <= 1}>
                                            <Minus size={16} />
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedCrust, 1)}>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="item-price">
                                    Rs. {(item.price * item.quantity).toLocaleString()}
                                </div>
                                <button className="remove-btn" onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedCrust)}>
                                    <Trash size={20} />
                                </button>
                            </div>
                        ))}
                        <div className="cart-actions-row">
                            <button className="text-btn" onClick={clearCart}>Clear Cart</button>
                        </div>
                    </div>

                    <div className="order-summary">
                        <h2>Order Summary</h2>

                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>Rs. {cartTotal.toLocaleString()}</span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>Rs. {cartTotal.toLocaleString()}</span>
                        </div>
                        <button className="btn btn-primary checkout-btn" onClick={handleCheckout}>
                            Proceed to Checkout <ArrowRight weight="bold" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
