import './About.css';
import heroImage from '../assets/hero-pizza.png';

const About = () => {
    return (
        <div className="about-page">
            <div className="about-hero">
                <div className="container">
                    <h1>Our Story</h1>
                    <p>From a small family kitchen to your favorite pizza spot.</p>
                </div>
            </div>

            <div className="container about-content">
                <div className="about-section">
                    <div className="about-text">
                        <h2>Tradition Meets Innovation</h2>
                        <p>
                            Founded in 2010, PizzaSlice started with a simple mission: to serve the most authentic Neapolitan pizza in the city.
                            We believe that great pizza requires great ingredients. That's why we import our flour directly from Italy and source
                            our vegetables from local organic farms.
                        </p>
                        <p>
                            Our dough is fermented for 48 hours to ensure a light, airy crust that's easier to digest and packed with flavor.
                            Every pizza is hand-stretched and baked in our wood-fired oven at 900°F.
                        </p>
                    </div>
                    <div className="about-image">
                        <img src={heroImage} alt="Our Pizza" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
