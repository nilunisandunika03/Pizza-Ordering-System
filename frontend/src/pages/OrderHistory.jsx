import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Package, Clock, CheckCircle } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import './OrderHistory.css';

const OrderHistory = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/orders/mine');
                setOrders(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load orders.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchOrders();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

    if (!user) {
        return (
            <div className="order-history-page">
                <div className="container">
                    <h1>My Orders</h1>
                    <div className="empty-state">
                        <Clock size={64} color="#ccc" />
                        <p>Please <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>login</Link> to view your order history.</p>
                    </div>
                </div>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'orange';
            case 'processing': return 'blue';
            case 'confirmed': return 'blue';
            case 'delivered': return 'green';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    return (
        <div className="order-history-page">
            <div className="container">
                <h1>My Orders</h1>
                {error && <div className="error-msg">{error}</div>}

                {orders.length === 0 ? (
                    <div className="empty-state">
                        <Package size={64} color="#ccc" />
                        <p>You haven't placed any orders yet.</p>
                    </div>
                ) : (
                    <div className="orders-list">
                        {orders.map(order => (
                            <Link to={`/orders/${order._id}`} key={order._id} className="order-card-link">
                                <div className="order-card">
                                    <div className="order-header">
                                        <div className="order-id">
                                            <span className="label">Order</span>
                                            <span className="value">#{order.order_number}</span>
                                        </div>
                                        <div className={`order-status status-${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </div>
                                    </div>
                                    <div className="order-meta">
                                        <span className="order-date">
                                            <Clock size={16} />
                                            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                        </span>
                                        <span className="order-total">
                                            Rs. {order.total.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="order-items-preview">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="order-item-row">
                                                <span className="qty">{item.quantity}x</span>
                                                <span className="name">{item.product_snapshot?.name || item.name}</span>
                                                <span className="details">({item.customization?.size || item.selectedSize})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistory;
