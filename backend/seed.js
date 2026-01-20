const mongoose = require('mongoose');
const User = require('./database/models/User');
const Category = require('./database/models/Category');
const Product = require('./database/models/Product');
require('dotenv').config();

const { connectDB } = require('./database/database');

const seedDatabase = async () => {
    try {
        await connectDB();

        console.log('🌱 Starting database seeding...');


        console.log('🧹 Clearing old data...');
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('✨ Database cleared.');

        // ====================  Admin User ====================
        const adminExists = await User.findOne({ email: 'nilunisandunika03@gmail.com' });
        if (!adminExists) {
            await User.create({
                email: 'nilunisandunika03@gmail.com',
                password_hash: 'Admin@123456',
                full_name: 'System Administrator',
                is_verified: true,
                role: 'admin'
            });
            console.log('✅ Admin user created: nilunisandunika03@gmail.com / Admin@123456');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // ==================== Create Categories ====================
        const categories = [
            { name: 'Vegetarian', description: 'Delicious vegetarian pizzas', display_order: 1, icon: '🥗' },
            { name: 'Meat', description: 'Meat lovers favorites', display_order: 2, icon: '🍖' },
            { name: 'Spicy', description: 'Hot and spicy options', display_order: 3, icon: '🌶️' }
        ];

        for (const cat of categories) {
            const exists = await Category.findOne({ name: cat.name });
            if (!exists) {
                await Category.create(cat);
                console.log(`✅ Category created: ${cat.name}`);
            }
        }

        // ==================== Create Sample Products ====================
        const vegetarianCategory = await Category.findOne({ name: 'Vegetarian' });
        const meatCategory = await Category.findOne({ name: 'Meat' });
        const spicyCategory = await Category.findOne({ name: 'Spicy' });

        const products = [
            {
                name: 'Classic Margherita',
                description: 'San Marzano tomato sauce, fresh mozzarella di bufala, basil, extra virgin olive oil.',
                category: vegetarianCategory._id,
                base_price: 850,
                is_vegetarian: true,
                is_featured: true,
                images: ['/images/pizzas/veggie_supreme.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Cheese', price: 150, is_available: true },
                    { name: 'Mushrooms', price: 100, is_available: true },
                    { name: 'Olives', price: 100, is_available: true }
                ],
                average_rating: 4.8
            },
            {
                name: 'Double Pepperoni',
                description: 'Crispy cup pepperoni, spicy tomato sauce, mozzarella, parmesan, oregano.',
                category: meatCategory._id,
                base_price: 850,
                is_featured: true,
                images: ['/images/pizzas/meat_lovers.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Pepperoni', price: 200, is_available: true },
                    { name: 'Jalapeños', price: 80, is_available: true },
                    { name: 'Extra Cheese', price: 150, is_available: true }
                ],
                average_rating: 4.9
            },
            {
                name: 'Truffle Mushroom',
                description: 'Wild mushrooms, truffle cream base, thyme, mozzarella, garlic oil.',
                category: vegetarianCategory._id,
                base_price: 850,
                is_vegetarian: true,
                is_featured: true,
                images: ['/images/pizzas/veggie_supreme.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Mushrooms', price: 120, is_available: true },
                    { name: 'Truffle Oil', price: 200, is_available: true }
                ],
                average_rating: 4.7
            },
            {
                name: 'Four Cheese',
                description: 'Mozzarella, gorgonzola, fontina, and parmesan cheese with a touch of honey.',
                category: vegetarianCategory._id,
                base_price: 850,
                is_vegetarian: true,
                images: ['/images/pizzas/veggie_supreme.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [],
                average_rating: 4.6
            },
            {
                name: 'Spicy Hawaiian',
                description: 'Roasted pineapple, jalapeños, smoked ham, bacon, mozzarella.',
                category: spicyCategory._id,
                base_price: 850,
                is_featured: true,
                spice_level: 'Medium',
                images: ['/images/pizzas/spicy_hawaiian.png'],
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Jalapeños', price: 80, is_available: true },
                    { name: 'Extra Bacon', price: 180, is_available: true }
                ],
                average_rating: 4.5
            },
            {
                name: 'BBQ Chicken',
                description: 'Grilled chicken, red onions, cilantro, BBQ sauce base, gouda cheese.',
                category: meatCategory._id,
                base_price: 850,
                is_featured: true,
                images: ['/images/pizzas/bbq_chicken.png'],
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Chicken', price: 220, is_available: true },
                    { name: 'Bacon', price: 180, is_available: true }
                ],
                average_rating: 4.8
            },
            {
                name: 'Veggie Supreme',
                description: 'Bell peppers, onions, olives, mushrooms, tomatoes, spinach, feta.',
                category: vegetarianCategory._id,
                base_price: 850,
                is_vegetarian: true,
                images: ['/images/pizzas/veggie_supreme.png'],
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Spinach', price: 100, is_available: true },
                    { name: 'Feta Cheese', price: 150, is_available: true }
                ],
                average_rating: 4.7
            },
            {
                name: 'Meat Lovers',
                description: 'Pepperoni, sausage, bacon, ham, ground beef, mozzarella.',
                category: meatCategory._id,
                base_price: 850,
                is_featured: true,
                images: ['/images/pizzas/meat_lovers.png'],
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Meat', price: 250, is_available: true }
                ],
                average_rating: 4.9
            },
            {
                name: 'Spicy Diablo',
                description: 'Spicy salami, chili flakes, hot honey, mozzarella, basil.',
                category: spicyCategory._id,
                base_price: 850,
                spice_level: 'Hot',
                images: ['/images/pizzas/spicy_diablo.png'],
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Chili', price: 80, is_available: true },
                    { name: 'Hot Honey', price: 100, is_available: true }
                ],
                average_rating: 4.8
            },
            {
                name: 'Pesto Garden',
                description: 'Basil pesto base, cherry tomatoes, pine nuts, ricotta cheese.',
                category: vegetarianCategory._id,
                base_price: 850,
                is_vegetarian: true,
                images: ['/images/pizzas/veggie_supreme.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Pine Nuts', price: 120, is_available: true },
                    { name: 'Ricotta', price: 150, is_available: true }
                ],
                average_rating: 4.6
            },
            {
                name: 'Italian Sausage',
                description: 'Fennel sausage, roasted peppers, onions, mozzarella.',
                category: meatCategory._id,
                base_price: 850,
                images: ['/images/pizzas/meat_lovers.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Sausage', price: 200, is_available: true }
                ],
                average_rating: 4.7
            },
            {
                name: 'Buffalo Chicken',
                description: 'Spicy buffalo sauce, grilled chicken, blue cheese drizzle, celery.',
                category: spicyCategory._id,
                base_price: 850,
                spice_level: 'Medium',
                images: ['/images/pizzas/bbq_chicken.png'], // Placeholder
                sizes: [
                    { name: 'Personal', price_modifier: 0 },
                    { name: 'Medium', price_modifier: 740 },
                    { name: 'Large', price_modifier: 2130 }
                ],
                crusts: [
                    { name: 'Pan', price_modifier: 0 },
                    { name: 'Ultimate Cheese', price_modifier: 600 },
                    { name: 'Sausage', price_modifier: 600 }
                ],
                toppings: [
                    { name: 'Extra Chicken', price: 220, is_available: true },
                    { name: 'Blue Cheese', price: 150, is_available: true }
                ],
                average_rating: 4.6
            }
        ];

        for (const prod of products) {
            const exists = await Product.findOne({ name: prod.name });
            if (!exists) {
                await Product.create(prod);
                console.log(`✅ Product created: ${prod.name}`);
            }
        }

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Admin: admin@pizzasystem.com / Admin@123456');
        console.log('\n💡 You can now start the server with: npm run dev');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
