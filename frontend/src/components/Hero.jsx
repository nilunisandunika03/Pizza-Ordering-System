import { Link } from 'react-router-dom';
import { ArrowRight, Fire } from 'phosphor-react';
import './Hero.css';
import heroImage from '../assets/hero-pizza.png';

const Hero = () => {
    return (
        <section className="hero">
            <div className="container hero-container">
                <div className="hero-content">
                    <div className="badge">
                        <Fire weight="fill" color="var(--primary)" />
                        <span>Best Pizza in Town</span>
                    </div>
                    <h1>
                        Slice of <span className="highlight">Heaven</span> in <br />
                        Every Bite
                    </h1>
                    <p>
                        Authentic Italian dough, hand-picked fresh ingredients, and a secret family sauce recipe passed down for generations.
                        Experience the taste of perfection.
                    </p>
                    <div className="hero-actions">
                       <a href="#featured" className="btn btn-primary">
                            Order Now <ArrowRight weight="bold" />
                        </a>
                        <Link to="/menu" className="btn btn-secondary">
                            View Menu
                        </Link>
                    </div>

                    <div className="stats">
                        <div className="stat-item">
                            <span className="stat-num">20+</span>
                            <span className="stat-label">Flavors</span>
                        </div>
                        <div className="driver"></div>
                        <div className="stat-item">
                            <span className="stat-num">30m</span>
                            <span className="stat-label">Delivery</span>
                        </div>
                        <div className="driver"></div>
                        <div className="stat-item">
                            <span className="stat-num">4.9</span>
                            <span className="stat-label">Rating</span>
                        </div>
                    </div>
                </div>

                <div className="hero-image">
                    <div className="image-wrapper">
                        <img src={heroImage} alt="Delicious Pepperoni Pizza" />
                        <div className="floating-card c1">
                            <span>🔥 Hot & Spicy</span>
                        </div>
                        <div className="floating-card c2">
                            <span>🧀 Extra Cheese</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
