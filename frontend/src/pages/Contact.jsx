import { Envelope, Phone, MapPin } from 'phosphor-react';
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import api from '../api/axios';
import './Contact.css';

const Contact = () => {
    const [captcha, setCaptcha] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchCaptcha = async () => {
        try {
            const response = await api.get('/auth/captcha');
            setCaptchaSvg(response.data.svg);
        } catch (err) {
            console.error('Failed to load captcha');
        }
    };

    useEffect(() => {
        fetchCaptcha();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await api.post('/auth/verify-captcha', { captcha });
            setSuccess('Message sent successfully! We will get back to you soon.');
            setCaptcha('');
        } catch (err) {
            setError(err.response?.data?.message || 'CAPTCHA verification failed');
            fetchCaptcha();
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="contact-page">
            <div className="contact-header">
                <div className="container">
                    <h1>Get in Touch</h1>
                    <p>We'd love to hear from you. Send us a message or visit us.</p>
                </div>
            </div>

            <div className="container contact-container">
                <div className="contact-info">
                    <div className="info-card">
                        <div className="icon-box"><Phone size={32} /></div>
                        <h3>Phone</h3>
                        <p>+1 (555) 123-4567</p>
                        <p>Mon-Sun: 10am - 11pm</p>
                    </div>
                    <div className="info-card">
                        <div className="icon-box"><Envelope size={32} /></div>
                        <h3>Email</h3>
                        <p>hello@pizzaslice.com</p>
                        <p>support@pizzaslice.com</p>
                    </div>
                    <div className="info-card">
                        <div className="icon-box"><MapPin size={32} /></div>
                        <h3>Location</h3>
                        <p>123 Pizza Street</p>
                        <p>Food City, FC 90210</p>
                    </div>
                </div>

                <div className="contact-form-section">
                    <h2>Send Message</h2>
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" placeholder="Your Name" />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" placeholder="Your Email" />
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea rows="5" placeholder="How can we help?"></textarea>
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
                                placeholder="Enter characters exactly"
                                required
                            />
                        </div>
                        <button className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
