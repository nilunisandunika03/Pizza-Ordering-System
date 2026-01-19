import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { User, MapPin, Phone, Envelope, HouseLine, Clock } from 'phosphor-react';
import './Auth.css'; // Reuse Auth styles

const Profile = () => {
    const { user, logout, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        address: {
            no: '',
            street: '',
            city: '',
            state: '',
            zip_code: ''
        }
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.full_name || user.fullName || '',
                address: {
                    no: user.address?.no || '',
                    street: user.address?.street || '',
                    city: user.address?.city || '',
                    state: user.address?.state || '',
                    zip_code: user.address?.zip_code || ''
                }
            });
        }
    }, [user]);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
    };

    return (
        <div className="auth-page profile-page">
            <div className="container">
                <div className="auth-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="auth-header">
                        <div className="profile-avatar">
                            <User size={48} weight="bold" />
                        </div>
                        <h2>{isEditing ? 'Edit Profile' : 'My Profile'}</h2>
                        <p>{isEditing ? 'Update your personal details and address' : 'Manage your account and order history'}</p>
                    </div>

                    {message.text && (
                        <div className={`alert ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {!isEditing ? (
                        <div className="profile-info-grid">
                            <div className="info-section">
                                <h3>Personal Information</h3>
                                <div className="info-item">
                                    <User size={20} />
                                    <div>
                                        <label>Full Name</label>
                                        <p>{user.full_name || user.fullName || "User"}</p>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <Envelope size={20} />
                                    <div>
                                        <label>Email Address</label>
                                        <p>{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Saved Address (Sri Lanka)</h3>
                                {user.address && user.address.street ? (
                                    <div className="info-item">
                                        <MapPin size={20} />
                                        <div>
                                            <label>Delivery Address</label>
                                            <p>
                                                No. {user.address.no}, {user.address.street},<br />
                                                {user.address.city}, {user.address.state} {user.address.zip_code}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="no-data">No address saved yet.</p>
                                )}
                            </div>

                            <div className="profile-actions">
                                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                                    Edit Profile
                                </button>
                                <Link to="/orders" className="btn btn-secondary">
                                    <Clock size={20} /> View Order History
                                </Link>
                                <button onClick={logout} className="btn btn-logout">
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="profile-form">
                            <div className="form-grid">
                                <div className="form-section">
                                    <h3>Basic Info</h3>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={user.email}
                                            disabled
                                            className="disabled-input"
                                        />
                                        <small>Email cannot be changed.</small>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3>Address Details</h3>
                                    <div className="form-row">
                                        <div className="form-group" style={{ flex: '1' }}>
                                            <label>No.</label>
                                            <input
                                                type="text"
                                                name="address.no"
                                                value={formData.address.no}
                                                onChange={handleChange}
                                                placeholder="123/A"
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: '3' }}>
                                            <label>Street</label>
                                            <input
                                                type="text"
                                                name="address.street"
                                                value={formData.address.street}
                                                onChange={handleChange}
                                                placeholder="Main Street"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            name="address.city"
                                            value={formData.address.city}
                                            onChange={handleChange}
                                            placeholder="Colombo"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>State / Province</label>
                                            <input
                                                type="text"
                                                name="address.state"
                                                value={formData.address.state}
                                                onChange={handleChange}
                                                placeholder="Western"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>ZIP Code</label>
                                            <input
                                                type="text"
                                                name="address.zip_code"
                                                value={formData.address.zip_code}
                                                onChange={handleChange}
                                                placeholder="10100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style jsx>{`
                .profile-page {
                    padding-top: 120px;
                    padding-bottom: 80px;
                }
                .profile-avatar {
                    width: 80px;
                    height: 80px;
                    background: #fdf2f2;
                    color: var(--primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }
                .profile-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 24px;
                }
                .info-section h3 {
                    font-size: 1.1rem;
                    margin-bottom: 16px;
                    color: var(--text-main);
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                .info-item {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .info-item label {
                    display: block;
                    font-size: 0.8rem;
                    color: #888;
                    margin-bottom: 2px;
                }
                .info-item p {
                    font-weight: 500;
                    color: var(--text-main);
                }
                .no-data {
                    color: #999;
                    font-style: italic;
                }
                .profile-actions {
                    grid-column: 1 / -1;
                    display: flex;
                    gap: 16px;
                    margin-top: 24px;
                    border-top: 1px solid #eee;
                    padding-top: 24px;
                }
                .disabled-input {
                    background: #f9fafb;
                    color: #999;
                    cursor: not-allowed;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                }
                .form-actions {
                    display: flex;
                    gap: 16px;
                    margin-top: 32px;
                }
                @media (max-width: 768px) {
                    .profile-info-grid, .form-grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                }
            `}</style>
        </div>
    );
};

export default Profile;
