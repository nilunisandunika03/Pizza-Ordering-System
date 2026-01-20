import { Link, NavLink } from 'react-router-dom';
import { Pizza, ShoppingCart, User, Clock } from 'phosphor-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
    const { cartCount } = useCart();
    const { user } = useAuth();

    return (
        <header className="header">
            <div className="container header-container">
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <Pizza size={32} weight="fill" />
                    </div>
                    <span className="logo-text">Pizza<span className="highlight">Slice</span></span>
                </Link>

                <nav className="nav-menu">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        Home
                    </NavLink>
                    
                    {/* Menu link only for non-admin users */}
                    {(!user || user.role !== 'admin') && (
                        <NavLink to="/menu" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            Menu
                        </NavLink>
                    )}
                    
                    <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        About
                    </NavLink>
                    <NavLink to="/contact" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        Contact
                    </NavLink>
                    
                    {/* Admin link only for admin users */}
                    {user && user.role === 'admin' && (
                        <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active admin-link' : 'nav-link admin-link'}>
                            Admin Panel
                        </NavLink>
                    )}
                </nav>

                <div className="header-actions">
                    {/* Cart and Orders - Only for non-admin users */}
                    {(!user || user.role !== 'admin') && (
                        <>
                            <Link to="/cart" className="cart-btn" aria-label="Cart">
                                <ShoppingCart size={24} weight="bold" />
                                <span className="cart-count">{cartCount}</span>
                            </Link>

                            <Link to="/orders" className="orders-btn" title="My Orders">
                                <Clock size={24} weight="bold" />
                            </Link>
                        </>
                    )}

                    {user ? (
                        <div className="user-actions">
                            <Link to="/profile" className="profile-btn" aria-label="Profile">
                                <User size={24} weight="bold" />
                            </Link>
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="login-btn">
                                Login
                            </Link>
                            <Link to="/signup" className="register-btn">
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
