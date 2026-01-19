import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is logged in (session exists) on mount
    useEffect(() => {
        const checkAuth = async () => {
            // Development mode: use mock user to bypass login
            // Development mode bypass removed

            try {
                const response = await api.get('/auth/me');
                setUser(response.data.user);
            } catch (error) {
                // Handle different error types
                if (error.response) {
                    // Server responded with error status (401, 500, etc.)
                    if (error.response.status === 401) {
                        console.log('User not authenticated');
                    } else {
                        console.error(`Auth check failed with status ${error.response.status}:`, error.response.data?.message);
                    }
                } else if (error.request) {
                    // Request made but no response received
                    console.error('No response from server:', error.message);
                } else {
                    // Error in request setup
                    console.error('Error checking authentication:', error.message);
                }
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (email, password, captcha) => {
        // This function now returns the response data so component can handle MFA
        const response = await api.post('/auth/login', { email, password, captcha });
        // If MFA not required (e.g. disabled setting?), we might set user here, 
        // but our backend always requires MFA given the task description.
        // So we expect { requireMfa: true }
        return response.data;
    };

    const verifyOtp = async (otp) => {
        const response = await api.post('/auth/verify-otp', { otp });
        setUser(response.data.user);
        return response.data;
    };
    const signup = async (name, email, password, captcha) => {
        const response = await api.post('/auth/register', { fullName: name, email, password, captcha });
        return response.data; // Expect message about checking email
    };

    const updateProfile = async (data) => {
        const response = await api.put('/auth/profile', data);
        setUser(response.data.user);
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyOtp, signup, logout, loading, updateProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
