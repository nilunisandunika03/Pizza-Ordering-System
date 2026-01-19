import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, Package, Phone, MapPin, Clock, CreditCard, HouseLine } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import './Checkout.css';

const Checkout = () => {
    const { user } = useAuth();
    const { cartItems, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const [step, setStep] = useState('details'); // details, payment, processing, success
    const [orderType, setOrderType] = useState(null); // null, delivery, takeaway
    const [deliveryInfo, setDeliveryInfo] = useState({
        no: '',
        street: '',
        city: '',
        province: '',
        zipCode: '',
        contact1: '',
        contact2: ''
    });

    // Payment State
    const [saveCard, setSaveCard] = useState(false);
    const [selectedCardIdx, setSelectedCardIdx] = useState('new'); // 'new' or index
    const [cardDetails, setCardDetails] = useState({
        name: '',
        number: '',
        expiry: '',
        cvv: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Order info needed for success screen
    const [confirmedOrder, setConfirmedOrder] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else if (cartItems.length === 0 && step !== 'success') {
            navigate('/menu');
        }
    }, [user, cartItems, navigate, step]);

    const deliveryFee = orderType === 'delivery' ? 300 : 0;
    const finalTotal = cartTotal + deliveryFee;

    const handleDetailsSubmit = (e) => {
        e.preventDefault();
        if (!orderType) {
            alert('Please select an order type (Delivery or Takeaway) to proceed.');
            return;
        }
        
        // Validate contact numbers if delivery is selected
        if (orderType === 'delivery') {
            const contact1Digits = deliveryInfo.contact1.replace(/\D/g, '');
            const contact2Digits = deliveryInfo.contact2.replace(/\D/g, '');
            
            if (contact1Digits.length !== 10) {
                alert('Primary contact must be exactly 10 digits.');
                return;
            }
            if (contact2Digits.length !== 10) {
                alert('Secondary contact must be exactly 10 digits.');
                return;
            }
        }
        
        setStep('payment');
    };

    // Handle contact number input - only allow digits and limit to 10
    const handleContactChange = (field, value) => {
        const digitsOnly = value.replace(/\D/g, ''); // Remove non-digits
        if (digitsOnly.length <= 10) {
            setDeliveryInfo({ ...deliveryInfo, [field]: digitsOnly });
        }
    };

    // Format card number with spaces (XXXX XXXX XXXX)
    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 12) value = value.slice(0, 12); // Limit to 12 digits

        // Add spaces every 4 digits
        let formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');

        setCardDetails({ ...cardDetails, number: formattedValue });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validate Payment Inputs for New Cards
            if (selectedCardIdx === 'new') {
                const cleanNumber = cardDetails.number.replace(/\s/g, '');

                // 1. Validate Card Number (12 digits)
                if (cleanNumber.length !== 12) {
                    throw new Error("Card number must be exactly 12 digits.");
                }

                // 2. Validate Expiry Date (Future MM/YY)
                if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
                    throw new Error("Expiry date must be in MM/YY format.");
                }

                const [month, year] = cardDetails.expiry.split('/').map(Number);
                const now = new Date();
                const currentYear = parseInt(now.getFullYear().toString().slice(-2));
                const currentMonth = now.getMonth() + 1;

                if (month < 1 || month > 12) {
                    throw new Error("Invalid expiry month.");
                }
                if (year < currentYear || (year === currentYear && month < currentMonth)) {
                    throw new Error("Card has expired.");
                }

                // 3. Validate CVC (3 digits)
                if (!/^\d{3}$/.test(cardDetails.cvv)) {
                    throw new Error("CVV must be exactly 3 digits.");
                }
            }

            // Prepare Payment Info
            let paymentInfo = {};
            if (selectedCardIdx !== 'new' && user.savedCards && user.savedCards[selectedCardIdx]) {
                const saved = user.savedCards[selectedCardIdx];
                paymentInfo = {
                    method: 'card',
                    last4: saved.last4,
                    brand: saved.brand,
                    saveCard: false // Already saved
                };
            } else {
                const cleanNumber = cardDetails.number.replace(/\s/g, '');
                paymentInfo = {
                    method: 'card',
                    last4: cleanNumber.slice(-4),
                    brand: 'Card',
                    expiry: cardDetails.expiry,
                    cardHolder: cardDetails.name,
                    saveCard: saveCard
                };
            }

            const orderData = {
                items: cartItems,
                subtotal: cartTotal,
                deliveryFee,
                total: finalTotal,
                deliveryType: orderType,
                deliveryInfo,
                paymentInfo
            };

            const response = await api.post('/orders', orderData);

            setConfirmedOrder(response.data);
            setStep('processing');

            // Simulation of processing time
            setTimeout(() => {
                setStep('success');
                clearCart();
            }, 2000);

        } catch (err) {
            console.error(err);
            // Handle both Axios errors and our custom validation errors
            const errorMessage = err.response?.data?.message || err.message || 'Payment processing failed';
            setError(errorMessage);
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="checkout-page success">
                <div className="success-card">
                    <CheckCircle size={64} color="#4CAF50" weight="fill" />
                    <h1>Order Confirmed!</h1>
                    <p>Thank you, {user?.full_name || user?.name}!</p>
                    <p>Order #{confirmedOrder?.orderNumber}</p>
                    <p>{orderType === 'delivery' ? 'Your delicious pizza will be delivered to you within 30 minutes!' : 'Your pizza will be ready for pickup soon.'}</p>
                    <div className="success-actions">
                        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
                            View Order History
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'processing') {
        return (
            <div className="checkout-page processing">
                <div className="spinner"></div>
                <h2>Processing Payment...</h2>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="container">
                <div className="checkout-header">
                    <h1>Checkout</h1>
                    <div className="checkout-steps">
                        <div className={`step-indicator ${step === 'details' ? 'active' : 'completed'}`}>1. Order Details</div>
                        <div className={`step-indicator ${step === 'payment' ? 'active' : ''}`}>2. Payment</div>
                    </div>
                </div>

                <div className="checkout-grid">
                    <div className="checkout-main">
                        {step === 'details' ? (
                            <div className="details-section">
                                <h2>How would you like your pizza?</h2>
                                <div className="order-type-toggle">
                                    <button
                                        className={`type-btn ${orderType === 'delivery' ? 'active' : ''}`}
                                        onClick={() => setOrderType('delivery')}
                                    >
                                        <Truck size={24} />
                                        <span>Delivery</span>
                                    </button>
                                    <button
                                        className={`type-btn ${orderType === 'takeaway' ? 'active' : ''}`}
                                        onClick={() => setOrderType('takeaway')}
                                    >
                                        <Package size={24} />
                                        <span>Takeaway</span>
                                    </button>
                                </div>

                                <form onSubmit={handleDetailsSubmit} className="checkout-form">
                                    {orderType === 'delivery' && (
                                        <div className="delivery-form">
                                            <div className="delivery-notification">
                                                <Clock size={20} weight="fill" />
                                                <span>Estimated delivery time: <strong>30 Minutes</strong></span>
                                            </div>

                                            <div className="form-group">
                                                <label><HouseLine size={16} /> Delivery Address</label>
                                                <div className="address-grid">
                                                    <div className="form-row">
                                                        <div className="form-group" style={{ flex: '1' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="No."
                                                                required
                                                                value={deliveryInfo.no}
                                                                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, no: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ flex: '3' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Street Name"
                                                                required
                                                                value={deliveryInfo.street}
                                                                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, street: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <input
                                                                type="text"
                                                                placeholder="City"
                                                                required
                                                                value={deliveryInfo.city}
                                                                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <input
                                                                type="text"
                                                                placeholder="Province"
                                                                required
                                                                value={deliveryInfo.province}
                                                                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, province: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <input
                                                                type="text"
                                                                placeholder="ZIP Code"
                                                                required
                                                                value={deliveryInfo.zipCode}
                                                                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, zipCode: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label><Phone size={16} /> Primary Contact</label>
                                                    <input
                                                        type="tel"
                                                        placeholder="07X XXX XXXX"
                                                        required
                                                        value={deliveryInfo.contact1}
                                                        onChange={(e) => handleContactChange('contact1', e.target.value)}
                                                        maxLength="10"
                                                        pattern="\d{10}"
                                                        title="Please enter exactly 10 digits"
                                                    />
                                                    {deliveryInfo.contact1 && deliveryInfo.contact1.length !== 10 && (
                                                        <small style={{ color: '#e74c3c' }}>Must be 10 digits ({deliveryInfo.contact1.length}/10)</small>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label><Phone size={16} /> Secondary Contact</label>
                                                    <input
                                                        type="tel"
                                                        placeholder="07X XXX XXXX"
                                                        required
                                                        value={deliveryInfo.contact2}
                                                        onChange={(e) => handleContactChange('contact2', e.target.value)}
                                                        maxLength="10"
                                                        pattern="\d{10}"
                                                        title="Please enter exactly 10 digits"
                                                    />
                                                    {deliveryInfo.contact2 && deliveryInfo.contact2.length !== 10 && (
                                                        <small style={{ color: '#e74c3c' }}>Must be 10 digits ({deliveryInfo.contact2.length}/10)</small>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {orderType === 'takeaway' && (
                                        <div className="takeaway-info">
                                            <p>You can pick up your order at our main branch.</p>
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-primary btn-block">
                                        Proceed to Payment
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="payment-form-section">
                                <div className="payment-header">
                                    <button className="back-btn" onClick={() => setStep('details')}>← Back to Details</button>
                                    <h2>Payment Details</h2>
                                </div>
                                {error && <div className="alert error">{error}</div>}
                                <form onSubmit={handlePayment}>

                                    {/* Saved Cards Selection */}
                                    {user?.savedCards?.length > 0 && (
                                        <div className="saved-cards-section">
                                            <h3>Saved Cards</h3>
                                            <div className="saved-cards-list">
                                                {user.savedCards.map((card, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`saved-card-item ${selectedCardIdx === idx ? 'selected' : ''}`}
                                                        onClick={() => setSelectedCardIdx(idx)}
                                                    >
                                                        <div className="card-icon">{card.brand === 'Visa' ? '💳' : '💳'}</div>
                                                        <div className="card-info">
                                                            <span className="card-last4">•••• {card.last4}</span>
                                                            <span className="card-expiry">Expires {card.expiry}</span>
                                                        </div>
                                                        <div className="card-check">
                                                            {selectedCardIdx === idx && <CheckCircle size={20} weight="fill" color="#ff6b6b" />}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div
                                                    className={`saved-card-item new-card ${selectedCardIdx === 'new' ? 'selected' : ''}`}
                                                    onClick={() => setSelectedCardIdx('new')}
                                                >
                                                    <div className="card-icon"><CreditCard size={24} /></div>
                                                    <div className="card-info">Use a new card</div>
                                                    <div className="card-check">
                                                        {selectedCardIdx === 'new' && <CheckCircle size={20} weight="fill" color="#ff6b6b" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* New Card Form */}
                                    {selectedCardIdx === 'new' && (
                                        <div className="new-card-form">
                                            <div className="form-group">
                                                <label>Cardholder Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    required
                                                    value={cardDetails.name}
                                                    onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Card Number</label>
                                                <input
                                                    type="text"
                                                    placeholder="0000 0000 0000"
                                                    maxLength="14"
                                                    required
                                                    value={cardDetails.number}
                                                    onChange={handleCardNumberChange}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Expiry</label>
                                                    <input
                                                        type="text"
                                                        placeholder="MM/YY"
                                                        maxLength="5"
                                                        required
                                                        value={cardDetails.expiry}
                                                        onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>CVV</label>
                                                    <input
                                                        type="text"
                                                        placeholder="123"
                                                        maxLength="3"
                                                        required
                                                        value={cardDetails.cvv}
                                                        onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group checkbox-group">
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveCard}
                                                        onChange={(e) => setSaveCard(e.target.checked)}
                                                    />
                                                    Save this card for future orders
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                        {loading ? 'Processing...' : `Pay Rs. ${finalTotal.toLocaleString()}`}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="order-summary-mini">
                        <h3>Order Summary</h3>
                        <div className="mini-items-container">
                            {cartItems.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="mini-item">
                                    <div className="mini-item-info">
                                        <span className="mini-item-name">{item.name}</span>
                                        <span className="mini-item-meta">{item.selectedSize} | {item.selectedCrust}</span>
                                        <span className="mini-item-qty">Qty: {item.quantity}</span>
                                    </div>
                                    <span className="mini-item-price">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mini-divider"></div>
                        <div className="summary-calculations">
                            <div className="mini-row">
                                <span>Subtotal</span>
                                <span>Rs. {cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="mini-row">
                                <span>Delivery Fee</span>
                                <span>{deliveryFee > 0 ? `Rs. ${deliveryFee}` : 'FREE'}</span>
                            </div>
                            <div className="mini-divider"></div>
                            <div className="mini-row total">
                                <span>Total</span>
                                <span>Rs. {finalTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
