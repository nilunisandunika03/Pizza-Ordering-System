import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import './Auth.css';
import api from '../api/axios';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [otp, setOtp] = useState('');

    // UI State
    const [step, setStep] = useState(1); // 1: Credentials, 2: MFA
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, verifyOtp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const fetchCaptcha = async () => {
        try {
            const response = await api.get('/auth/captcha');
            setCaptchaSvg(response.data.svg);
        } catch (err) {
            console.error('Failed to load captcha:', err.message);
        }
    };

    useEffect(() => {
        if (step === 1) fetchCaptcha();
    }, [step]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password, captcha);
            // If we get here, login part 1 success (MFA sent)
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            fetchCaptcha(); // Refresh captcha
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await verifyOtp(otp);
            if (data.user.role === 'admin') {
                navigate('/admin', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>{step === 1 ? 'Welcome Back' : 'Security Verification'}</h2>
                <p>{step === 1 ? 'Login to continue' : 'Enter the code sent to your email'}</p>

                {error && <div className="alert error">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleLoginSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Captcha</label>
                            <div className="captcha-container">
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(captchaSvg) }} className="captcha-img" />
                                <button type="button" onClick={fetchCaptcha} className="btn-icon">↻</button>
                            </div>
                            <input
                                type="text"
                                value={captcha}
                                onChange={(e) => setCaptcha(e.target.value)}
                                placeholder="Enter characters"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? 'Processing...' : 'Login'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleOtpSubmit}>
                        <div className="form-group">
                            <label>One-Time Password (OTP)</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="E.g. 123456"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" className="btn btn-link btn-block" onClick={() => setStep(1)}>
                            Back to Login
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
