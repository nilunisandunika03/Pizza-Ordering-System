import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [adminProfile, setAdminProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showProductModal, setShowProductModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    // Protection: If not admin, redirect to home
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        } else if (activeTab === 'orders') {
            fetchOrders();
        } else if (activeTab === 'products') {
            fetchProducts();
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'profile') {
            fetchAdminProfile();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/orders/admin/stats');
            setStats(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch statistics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/orders/admin/all');
            setOrders(response.data.orders);
            setError('');
        } catch (err) {
            setError('Failed to fetch orders');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/products');
            setProducts(response.data.products);
            setError('');
        } catch (err) {
            setError('Failed to fetch products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users');
            setUsers(response.data.users);
            setError('');
        } catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/profile');
            setAdminProfile(response.data.profile);
            setError('');
        } catch (err) {
            setError('Failed to fetch admin profile');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            await api.patch(`/orders/${orderId}/status`, { 
                status: newStatus,
                note: `Status updated to ${newStatus}`
            });
            setSuccess('Order status updated successfully');
            fetchOrders();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update order status');
            console.error(err);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        
        try {
            await api.delete(`/products/${productId}`);
            setSuccess('Product deleted successfully');
            fetchProducts();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete product');
            console.error(err);
        }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            base_price: parseFloat(formData.get('base_price')),
            is_vegetarian: formData.get('is_vegetarian') === 'true',
            is_featured: formData.get('is_featured') === 'true',
            is_available: formData.get('is_available') === 'true',
        };

        try {
            if (selectedProduct) {
                await api.put(`/products/${selectedProduct._id}`, productData);
                setSuccess('Product updated successfully');
            } else {
                await api.post('/products', productData);
                setSuccess('Product created successfully');
            }
            setShowProductModal(false);
            setSelectedProduct(null);
            fetchProducts();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to save product');
            console.error(err);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
        
        try {
            await api.delete(`/orders/admin/${orderId}`);
            setSuccess('Order deleted successfully');
            fetchOrders();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete order');
            console.error(err);
        }
    };

    const handleBlockUser = async (userId, reason) => {
        try {
            await api.patch(`/admin/users/${userId}/block`, { reason });
            setSuccess('User blocked successfully');
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to block user');
            console.error(err);
        }
    };

    const handleUnblockUser = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/unblock`);
            setSuccess('User unblocked successfully');
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to unblock user');
            console.error(err);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            role: formData.get('role'),
        };

        try {
            await api.put(`/admin/users/${selectedUser.id || selectedUser._id}`, userData);
            setSuccess('User updated successfully');
            setShowUserModal(false);
            setSelectedUser(null);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update user');
            console.error(err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
        };

        try {
            await api.put('/admin/profile', profileData);
            setSuccess('Profile updated successfully');
            setShowProfileModal(false);
            fetchAdminProfile();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update profile');
            console.error(err);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            role: formData.get('role'),
            is_verified: formData.get('is_verified') === 'true'
        };

        try {
            await api.put(`/admin/users/${selectedUser._id}`, userData);
            setSuccess('User updated successfully');
            setShowUserModal(false);
            setSelectedUser(null);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user');
            console.error(err);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = {
            full_name: formData.get('full_name'),
            email: formData.get('email')
        };

        try {
            await api.put('/admin/profile', profileData);
            setSuccess('Profile updated successfully');
            setShowProfileModal(false);
            fetchAdminProfile();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
            console.error(err);
        }
    };

    const renderDashboard = () => (
        <div>
            {stats && (
                <>
                    <div className="stats-grid">
                        <div className="stat-card revenue">
                            <h3>Total Revenue</h3>
                            <p className="stat-value">Rs. {stats.stats.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="stat-card orders">
                            <h3>Total Orders</h3>
                            <p className="stat-value">{stats.stats.totalOrders}</p>
                        </div>
                        <div className="stat-card pending">
                            <h3>Pending Orders</h3>
                            <p className="stat-value">{stats.stats.pendingOrders}</p>
                        </div>
                        <div className="stat-card customers">
                            <h3>Total Customers</h3>
                            <p className="stat-value">{stats.stats.totalCustomers}</p>
                        </div>
                    </div>

                    <div className="content-card">
                        <h2>Recent Orders</h2>
                        {stats.recentOrders.length > 0 ? (
                            <div className="table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Order #</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentOrders.map(order => (
                                            <tr key={order._id}>
                                                <td>{order.order_number}</td>
                                                <td>{order.customer?.full_name || 'N/A'}</td>
                                                <td>Rs. {order.total.toFixed(2)}</td>
                                                <td>
                                                    <span className={`status-badge ${order.status}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>No recent orders</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const renderOrders = () => (
        <div className="content-card">
            <h2>All Orders</h2>
            {orders.length > 0 ? (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td>{order.order_number}</td>
                                    <td>{order.customer?.full_name || 'N/A'}</td>
                                    <td>{order.items.length}</td>
                                    <td>Rs. {order.total.toFixed(2)}</td>
                                    <td>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                            className="status-select"
                                        >
                                            <option value="confirmed">Confirmed</option>
                                            <option value="preparing">Preparing</option>
                                            <option value="ready">Ready</option>
                                            <option value="out_for_delivery">Out for Delivery</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="action-btn view"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowOrderModal(true);
                                            }}
                                        >
                                            View
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteOrder(order._id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No orders found</p>
            )}
        </div>
    );

    const renderProducts = () => (
        <div className="content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>All Products</h2>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setSelectedProduct(null);
                        setShowProductModal(true);
                    }}
                >
                    Add New Product
                </button>
            </div>
            {products.length > 0 ? (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Base Price</th>
                                <th>Featured</th>
                                <th>Available</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product._id}>
                                    <td>{product.name}</td>
                                    <td>{product.category?.name || 'N/A'}</td>
                                    <td>Rs. {product.base_price.toFixed(2)}</td>
                                    <td>{product.is_featured ? '✓' : '✗'}</td>
                                    <td>{product.is_available ? '✓' : '✗'}</td>
                                    <td>
                                        <button
                                            className="action-btn edit"
                                            onClick={() => {
                                                setSelectedProduct(product);
                                                setShowProductModal(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteProduct(product._id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No products found</p>
            )}
        </div>
    );

    const renderProfile = () => (
        <div className="content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Admin Profile</h2>
                <button className="btn-primary" onClick={() => setShowProfileModal(true)}>
                    Edit Profile
                </button>
            </div>
            {adminProfile ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <strong>Full Name:</strong> {adminProfile.full_name}
                    </div>
                    <div>
                        <strong>Email:</strong> {adminProfile.email}
                    </div>
                    <div>
                        <strong>Role:</strong> {adminProfile.role}
                    </div>
                    <div>
                        <strong>Verified:</strong> {adminProfile.is_verified ? 'Yes' : 'No'}
                    </div>
                    <div>
                        <strong>Member Since:</strong> {new Date(adminProfile.created_at).toLocaleDateString()}
                    </div>
                    <div>
                        <strong>Last Login:</strong> {adminProfile.last_login ? new Date(adminProfile.last_login).toLocaleString() : 'N/A'}
                    </div>
                </div>
            ) : (
                <p>Loading profile...</p>
            )}
        </div>
    );

    const renderUsers = () => (
        <div className="content-card">
            <h2>User Management</h2>
            {users.length > 0 ? (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Verified</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id || u._id} style={{ opacity: u.is_blocked ? 0.6 : 1 }}>
                                    <td>{u.email}</td>
                                    <td>{u.full_name}</td>
                                    <td>
                                        <span className={`role-badge ${u.role}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        {u.is_blocked ? (
                                            <span className="status-badge blocked">Blocked</span>
                                        ) : (
                                            <span className="status-badge active">Active</span>
                                        )}
                                    </td>
                                    <td>{u.is_verified ? '✓' : '✗'}</td>
                                    <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                                    <td>
                                        <button
                                            className="action-btn edit"
                                            onClick={() => {
                                                setSelectedUser(u);
                                                setShowUserModal(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        {u.is_blocked ? (
                                            <button
                                                className="action-btn success"
                                                onClick={() => handleUnblockUser(u.id || u._id)}
                                            >
                                                Unblock
                                            </button>
                                        ) : (
                                            <button
                                                className="action-btn warning"
                                                onClick={() => {
                                                    const reason = prompt('Enter reason for blocking:');
                                                    if (reason) handleBlockUser(u.id || u._id, reason);
                                                }}
                                            >
                                                Block
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No users found</p>
            )}
        </div>
    );

    return (
        <div className="admin-dashboard">
            <div className="admin-container">
                <div className="admin-header">
                    <h1>Admin Dashboard</h1>
                    <p>Welcome back, {user.fullName}! Manage your pizza ordering system.</p>
                </div>

                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        Orders
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => setActiveTab('products')}
                    >
                        Products
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile
                    </button>
                </div>

                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'orders' && renderOrders()}
                        {activeTab === 'products' && renderProducts()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'profile' && renderProfile()}
                    </>
                )}

                {/* Product Modal */}
                {showProductModal && (
                    <ProductModal
                        product={selectedProduct}
                        onClose={() => {
                            setShowProductModal(false);
                            setSelectedProduct(null);
                        }}
                        onSave={handleSaveProduct}
                    />
                )}

                {/* Order Details Modal */}
                {showOrderModal && selectedOrder && (
                    <OrderModal
                        order={selectedOrder}
                        onClose={() => {
                            setShowOrderModal(false);
                            setSelectedOrder(null);
                        }}
                    />
                )}

                {/* Profile Modal */}
                {showProfileModal && (
                    <ProfileModal
                        profile={adminProfile}
                        onClose={() => setShowProfileModal(false)}
                        onSave={handleUpdateProfile}
                    />
                )}

                {/* User Modal */}
                {showUserModal && selectedUser && (
                    <UserModal
                        user={selectedUser}
                        onClose={() => {
                            setShowUserModal(false);
                            setSelectedUser(null);
                        }}
                        onSave={handleUpdateUser}
                    />
                )}
            </div>
        </div>
    );
};

// Product Modal Component
const ProductModal = ({ product, onClose, onSave }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/categories');
                setCategories(response.data.categories);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        fetchCategories();
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={onSave}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={product?.name || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            defaultValue={product?.description || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            name="category"
                            defaultValue={product?.category?._id || ''}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Base Price (Rs.)</label>
                        <input
                            type="number"
                            name="base_price"
                            step="0.01"
                            defaultValue={product?.base_price || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Vegetarian</label>
                        <select name="is_vegetarian" defaultValue={product?.is_vegetarian || false}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Featured</label>
                        <select name="is_featured" defaultValue={product?.is_featured || false}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Available</label>
                        <select name="is_available" defaultValue={product?.is_available ?? true}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary">
                        {product ? 'Update Product' : 'Create Product'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

// Order Details Modal Component
const OrderModal = ({ order, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Order Details - {order.order_number}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div>
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> {order.customer?.full_name || 'N/A'}</p>
                    <p><strong>Email:</strong> {order.customer?.email || 'N/A'}</p>
                    
                    <h3>Order Items</h3>
                    {order.items.map((item, index) => (
                        <div key={index} style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}>
                            <p><strong>{item.product_snapshot?.name || 'Product'}</strong></p>
                            <p>Quantity: {item.quantity} | Price: Rs. {item.total_price.toFixed(2)}</p>
                            {item.customization && (
                                <p>Size: {item.customization.size} | Crust: {item.customization.crust}</p>
                            )}
                        </div>
                    ))}
                    
                    <h3>Delivery Information</h3>
                    {order.delivery_address && (
                        <p>
                            {order.delivery_address.street}, {order.delivery_address.city}<br />
                            Contact: {order.delivery_address.contact1}
                        </p>
                    )}
                    
                    <h3>Payment Summary</h3>
                    <p><strong>Subtotal:</strong> Rs. {order.subtotal.toFixed(2)}</p>
                    <p><strong>Delivery Fee:</strong> Rs. {order.delivery_fee.toFixed(2)}</p>
                    <p><strong>Total:</strong> Rs. {order.total.toFixed(2)}</p>
                    <p><strong>Payment Status:</strong> {order.payment_status}</p>
                    
                    <button className="btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// Profile Modal Component
const ProfileModal = ({ profile, onClose, onSave }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Profile</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={onSave}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            defaultValue={profile?.full_name || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={profile?.email || ''}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary">
                        Update Profile
                    </button>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

// User Modal Component
const UserModal = ({ user, onClose, onSave }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit User - {user?.email}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={onSave}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            defaultValue={user?.full_name || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={user?.email || ''}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select name="role" defaultValue={user?.role || 'customer'}>
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
                        <p><strong>Account Status:</strong> {user?.is_blocked ? 'Blocked' : 'Active'}</p>
                        {user?.is_blocked && (
                            <>
                                <p><strong>Blocked Reason:</strong> {user.blocked_reason}</p>
                                <p><strong>Blocked At:</strong> {new Date(user.blocked_at).toLocaleString()}</p>
                            </>
                        )}
                    </div>
                    <button type="submit" className="btn-primary">
                        Update User
                    </button>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminDashboard;
