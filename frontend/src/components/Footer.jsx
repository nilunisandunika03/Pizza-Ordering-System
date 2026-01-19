import { Pizza, InstagramLogo, FacebookLogo, TwitterLogo } from 'phosphor-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-brand">
                    <div className="logo">
                        <Pizza size={32} weight="fill" color="var(--primary)" />
                        <span>PizzaSlice</span>
                    </div>
                    <p>Authentic Italian flavors delivered to your doorstep. Taste the passion in every slice.</p>
                    <div className="social-links">
                        <a href="#" aria-label="Instagram"><InstagramLogo size={24} /></a>
                        <a href="#" aria-label="Facebook"><FacebookLogo size={24} /></a>
                        <a href="#" aria-label="Twitter"><TwitterLogo size={24} /></a>
                    </div>
                </div>

                <div className="footer-links">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/menu">Menu</a></li>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/contact">Contact</a></li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="/privacy">Privacy Policy</a></li>
                        <li><a href="/terms">Terms of Service</a></li>
                    </ul>
                </div>

                <div className="footer-newsletter">
                    <h4>Newsletter</h4>
                    <div className="input-group">
                        <input type="email" placeholder="Your email..." />
                        <button>Subscribe</button>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; 2025 PizzaSlice. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
