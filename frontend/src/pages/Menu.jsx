import { useState, useEffect } from 'react';
import PizzaCard from '../components/PizzaCard';
import api from '../api/axios';
import './Menu.css';

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await api.get('/products');
                setMenuItems(response.data.products);
            } catch (err) {
                console.error('Failed to fetch products:', err);
                setError('Failed to load menu. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const getFilteredItems = () => {
        if (activeCategory === 'All') return menuItems;
        return menuItems.filter(item => {
            const categoryName = item.category?.name || '';
            return categoryName === activeCategory;
        });
    };

    const displayItems = getFilteredItems();

    if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}><h2>Loading Menu...</h2></div>;
    if (error) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}><h2 style={{ color: '#ff6b6b' }}>{error}</h2></div>;

    return (
        <div className="menu-page">
            <div className="menu-header">
                <div className="container">
                    <h1>Our Menu</h1>
                    <p>Explore our wide range of handcrafted pizzas.</p>
                </div>
            </div>

            <div className="container menu-content">
                <div className="filters">
                    {['All', 'Vegetarian', 'Meat', 'Spicy'].map(category => (
                        <button
                            key={category}
                            className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="pizza-grid">
                    {displayItems.map(pizza => (
                        <PizzaCard key={pizza._id} pizza={{ ...pizza, id: pizza._id }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Menu;
