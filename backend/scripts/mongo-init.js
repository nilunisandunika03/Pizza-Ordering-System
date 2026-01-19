// MongoDB initialization script for Docker
db = db.getSiblingDB('pizza_ordering_system');

// Create collections
db.createCollection('users');
db.createCollection('products');
db.createCollection('categories');
db.createCollection('orders');
db.createCollection('carts');
db.createCollection('sessions');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.products.createIndex({ category: 1 });
db.orders.createIndex({ user: 1, createdAt: -1 });
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });

print('Database initialized successfully');
