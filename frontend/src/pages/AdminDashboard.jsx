import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // Protection: If not admin, redirect to home
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="auth-container" style={{ paddingTop: '120px', minHeight: '60vh' }}>
            <div className="auth-card" style={{ maxWidth: '800px', width: '100%' }}>
                <div className="auth-header">
                    <h2>Admin Dashboard</h2>
                    <p>Manage your systems and orders</p>
                </div>

                <div className="admin-content" style={{ marginTop: '2rem', textAlign: 'left' }}>
                    <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', borderLeft: '5px solid #2196f3' }}>
                        <h3>Welcome, Admin {user.fullName}!</h3>
                        <p>This is a restricted area. You can manage pizzas, orders, and users here.</p>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            <h4>Manage Orders</h4>
                            <p>12 Pending Orders</p>
                            <button className="btn btn-primary btn-sm">View</button>
                        </div>
                        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            <h4>Manage Menu</h4>
                            <p>24 Active Items</p>
                            <button className="btn btn-primary btn-sm">Edit</button>
                        </div>
                        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            <h4>User Base</h4>
                            <p>1.2k Customers</p>
                            <button className="btn btn-primary btn-sm">Manage</button>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="submit-btn"
                        style={{ marginTop: '2rem', background: '#ff4444' }}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
