import Hero from '../components/Hero';
import PizzaCard from '../components/PizzaCard';
import pizzaImage from '../assets/pizza-margherita.png';
import './Home.css';

const featuredPizzas = [
    {
        id: 1,
        name: "Classic Margherita",
        description: "San Marzano tomato sauce, fresh mozzarella di bufala, basil, extra virgin olive oil.",
        base_price: 850,
        rating: 4.8,
        images: [pizzaImage],
        average_rating: 4.8,
        sizes: [
            { name: 'Personal', price_modifier: 0 },
            { name: 'Medium', price_modifier: 740 },
            { name: 'Large', price_modifier: 2130 }
        ],
        crusts: [
            { name: 'Pan', price_modifier: 0 },
            { name: 'Ultimate Cheese', price_modifier: 600 },
            { name: 'Sausage', price_modifier: 600 }
        ]
    },
    {
        id: 2,
        name: "Double Pepperoni",
        description: "Crispy cup pepperoni, spicy tomato sauce, mozzarella, parmesan, oregano.",
        base_price: 850,
        rating: 4.9,
        images: [pizzaImage],
        average_rating: 4.9,
        sizes: [
            { name: 'Personal', price_modifier: 0 },
            { name: 'Medium', price_modifier: 740 },
            { name: 'Large', price_modifier: 2130 }
        ],
        crusts: [
            { name: 'Pan', price_modifier: 0 },
            { name: 'Ultimate Cheese', price_modifier: 600 },
            { name: 'Sausage', price_modifier: 600 }
        ]
    },
    {
        id: 3,
        name: "Truffle Mushroom",
        description: "Wild mushrooms, truffle cream base, thyme, mozzarella, garlic oil.",
        base_price: 850,
        rating: 4.7,
        images: [pizzaImage],
        average_rating: 4.7,
        sizes: [
            { name: 'Personal', price_modifier: 0 },
            { name: 'Medium', price_modifier: 740 },
            { name: 'Large', price_modifier: 2130 }
        ],
        crusts: [
            { name: 'Pan', price_modifier: 0 },
            { name: 'Ultimate Cheese', price_modifier: 600 },
            { name: 'Sausage', price_modifier: 600 }
        ]
    }
];

const Home = () => {
    return (
        <div className="home-page">
            <Hero />

            <section id="featured" className="section featured-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Featured <span className="highlight">Pizzas</span></h2>
                        <p>Curated favorites from our stone oven to your table.</p>
                    </div>

                    <div className="pizza-grid">
                        {featuredPizzas.map(pizza => (
                            <PizzaCard key={pizza.id} pizza={pizza} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="section bg-light">
                <div className="container">
                    <div className="cta-box">
                        <h2>Ready for a Slice?</h2>
                        <p>Order online for fast delivery or curb-side pickup.</p>
                        <div className="cta-actions">
                            <button className="btn btn-primary" onClick={() => window.location.href = "/menu"}>Order Now</button>
                            <button className="btn btn-secondary" onClick={() => window.location.href = "/menu"}>Our Menu</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
