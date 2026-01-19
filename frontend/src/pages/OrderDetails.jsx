import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, MapPin, CreditCard, Receipt, Clock, CheckCircle, XCircle, Truck, Package } from 'phosphor-react';
import './OrderDetails.css';

const OrderDetails = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await api.get(`/orders/${id}`);
                setOrder(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load order details.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) return <div className="page-loading"><div className="spinner"></div></div>;
    if (error) return <div className="error-container">{error} <Link to="/orders">Back to History</Link></div>;
    if (!order) return <div className="error-container">Order not found. <Link to="/orders">Back to History</Link></div>;

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case 'delivered': return <CheckCircle size={24} />;
            case 'cancelled': return <XCircle size={24} />;
            case 'out_for_delivery': return <Truck size={24} />;
            default: return <Clock size={24} />;
        }
    };

    return (
        <div className="order-details-page">
            <div className="container">
                <Link to="/orders" className="back-link">
                    <ArrowLeft size={20} /> Back to My Orders
                </Link>

                <div className="order-details-header">
                    <div>
                        <h1>Order #{order.order_number}</h1>
                        <p className="order-timestamp">
                            Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <div className={`status-badge status-${order.status.toLowerCase()}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status.replace('_', ' ')}</span>
                    </div>
                </div>

                <div className="details-grid">
                    {/* Items Column */}
                    <div className="details-main">
                        <section className="detail-card items-card">
                            <h2><Package size={20} /> Order Items</h2>
                            <div className="items-list">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="order-item">
                                        <div className="item-info">
                                            <span className="item-qty">{item.quantity}x</span>
                                            <div className="item-meta">
                                                <h3>{item.product_snapshot?.name || 'Unknown Product'}</h3>
                                                <p className="item-desc">
                                                    {item.customization?.size} • {item.customization?.crust}
                                                    {item.customization?.toppings?.length > 0 && ` • +${item.customization.toppings.join(', ')}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="item-price">
                                            Rs. {item.total_price.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="order-summary">
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>Rs. {order.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Delivery Fee</span>
                                    <span>Rs. {order.delivery_fee.toLocaleString()}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>Total</span>
                                    <span>Rs. {order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar Column */}
                    <div className="details-sidebar">
                        {order.delivery_address && (
                            <section className="detail-card">
                                <h2><MapPin size={20} /> Delivery Address</h2>
                                <address>
                                    {order.delivery_address.no}, {order.delivery_address.street}<br />
                                    {order.delivery_address.city}, {order.delivery_address.province}<br />
                                    {order.delivery_address.zip_code}<br />
                                    <br />
                                    <strong>Contact:</strong> {order.delivery_address.contact1}
                                </address>
                            </section>
                        )}

                        <section className="detail-card">
                            <h2><CreditCard size={20} /> Payment Info</h2>
                            <div className="info-row">
                                <span className="label">Method:</span>
                                <span className="value">{order.payment_method.toUpperCase()}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Status:</span>
                                <span className={`status-text ${order.payment_status}`}>
                                    {order.payment_status}
                                </span>
                            </div>
                        </section>

                        {order.status_history && order.status_history.length > 0 && (
                            <section className="detail-card timeline-card">
                                <h2><Clock size={20} /> Order Timeline</h2>
                                <div className="timeline">
                                    {order.status_history.slice().reverse().map((hist, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <p className="timeline-status">{hist.status}</p>
                                                <p className="timeline-time">
                                                    {new Date(hist.timestamp).toLocaleString()}
                                                </p>
                                                {hist.note && <p className="timeline-note">{hist.note}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
