import { useState } from 'react';
import { useCart } from '../context/CartContext';
import './PizzaCard.css';

const PizzaCard = ({ pizza }) => {
    const { name, description, images, average_rating } = pizza;
    const { addToCart } = useCart();

    const [size, setSize] = useState('Medium');
    const [crust, setCrust] = useState('Pan');

    // Display image from array
    const displayImage = (images && images.length > 0) ? images[0] : '/images/placeholder-pizza.png';


    const getPriceForSize = (sizeName) => {
        const sizeObj = pizza.sizes?.find(s => s.name === sizeName);
        return pizza.base_price + (sizeObj ? sizeObj.price_modifier : 0);
    };

    const getSurchargeForCrust = (crustName) => {
        const crustObj = pizza.crusts?.find(c => c.name === crustName);
        return crustObj ? crustObj.price_modifier : 0;
    };

    const basePrice = getPriceForSize(size);
    const surcharge = getSurchargeForCrust(crust);
    const totalPrice = basePrice + surcharge;

    const handleAddToCart = () => {
        addToCart({
            ...pizza,
            image: displayImage,
            price: totalPrice,
            selectedSize: size,
            selectedCrust: crust
        });
    };

    return (
        <div className="pizza-card">
            <div className="card-image">
                <img src={displayImage} alt={name} />
                <div className="rating">
                    ★ {average_rating || pizza.rating || '5.0'}
                </div>
            </div>
            <div className="card-content">
                <div className="card-info-section">
                    <h3>{name}</h3>
                    <p className="description-text">{description}</p>
                </div>

                <div className="card-divider"></div>

                <div className="customization-section">
                    <div className="select-group">
                        <label>Select your crust</label>
                        <select value={crust} onChange={(e) => setCrust(e.target.value)}>
                            {pizza.crusts?.map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} {c.price_modifier > 0 ? `(+Rs. ${c.price_modifier.toFixed(2)})` : '(Free)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="select-group">
                        <label>Select Size</label>
                        <select value={size} onChange={(e) => setSize(e.target.value)}>
                            {pizza.sizes?.map(s => (
                                <option key={s.name} value={s.name}>
                                    {s.name} - Rs. {(pizza.base_price + s.price_modifier).toFixed(2)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button className="add-to-cart-action" onClick={handleAddToCart}>
                    <span className="add-btn-text">Add</span>
                    <span className="btn-price-display">Rs. {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </button>
            </div>
        </div>
    );
};

export default PizzaCard;
