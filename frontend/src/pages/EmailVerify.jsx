import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

const EmailVerify = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
    const [message, setMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage('Email verified successfully!');
                // Optional: Redirect after a few seconds
                setTimeout(() => navigate('/login'), 5000);
            } catch (error) {
                const errorData = error.response?.data;
                
                // Check if link is expired
                if (errorData?.expired) {
                    setStatus('expired');
                    setMessage(errorData.message);
                    setUserEmail(errorData.email);
                } else {
                    setStatus('error');
                    setMessage(errorData?.message || 'Verification failed. Link may be expired.');
                }
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    const handleResendVerification = async () => {
        if (!userEmail) {
            setMessage('Email address not found. Please sign up again.');
            return;
        }

        setResending(true);
        try {
            const response = await api.post('/auth/resend-verification', { email: userEmail });
            setMessage(response.data.message);
            setStatus('resent');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Email Verification</h2>

                {status === 'verifying' && <p>Verifying your email...</p>}

                {status === 'success' && (
                    <div className="alert success">
                        <p>✅ {message}</p>
                        <p>Redirecting to login...</p>
                        <Link to="/login" className="btn btn-primary btn-block">Login Now</Link>
                    </div>
                )}

                {status === 'expired' && (
                    <div className="alert error">
                        <p>⏰ {message}</p>
                        <button 
                            onClick={handleResendVerification} 
                            className="btn btn-primary btn-block"
                            disabled={resending}
                        >
                            {resending ? 'Resending...' : 'Resend Verification Email'}
                        </button>
                    </div>
                )}

                {status === 'resent' && (
                    <div className="alert success">
                        <p>✅ {message}</p>
                        <p>Please check your email inbox.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="alert error">
                        <p>❌ {message}</p>
                        <Link to="/signup" className="btn btn-secondary btn-block">Back to Sign Up</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailVerify;
