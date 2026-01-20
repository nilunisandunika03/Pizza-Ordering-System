import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * UserRoute - Protected route component for customer-only pages
 * Redirects admin users to admin dashboard
 * Requires authentication for user-specific features
 */
const UserRoute = ({ children, requireAuth = true }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '60vh' 
            }}>
                <p>Loading...</p>
            </div>
        );
    }

    // If authentication is required and user is not logged in
    if (requireAuth && !user) {
        return <Navigate to="/login" replace />;
    }

    // If user is admin, redirect to admin dashboard
    if (user && user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default UserRoute;
