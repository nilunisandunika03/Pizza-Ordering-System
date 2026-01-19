require('dotenv').config();

// Validate environment before anything else
const { validateOrExit, checkProductionReadiness } = require('./utils/envValidator');
validateOrExit(true); // Exit if environment is invalid

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { connectDB, createIndexes } = require('./database/database');
const path = require('path');
const { 
    deviceFingerprint, 
    sessionActivityTimeout, 
    cspHeaders, 
    hstsHeader, 
    securityHeaders,
    ipThrottling 
} = require('./middleware/security.middleware');

// Check production readiness
if (process.env.NODE_ENV === 'production') {
    const prodCheck = checkProductionReadiness();
    if (!prodCheck.ready) {
        console.error('\n❌ FATAL: Production environment is not properly configured.');
        console.error('Fix the issues above before deploying to production.\n');
        process.exit(1);
    }
    console.log('✅ Production environment validated successfully\n');
}



// Connect to MongoDB
// Removed top-level call to prevent race condition
// connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(mongoSanitize()); // Prevention against NoSQL injection
app.use(cookieParser());

// Enhanced Security Middleware
app.use(cspHeaders); // Content Security Policy
app.use(hstsHeader); // HSTS for HTTPS enforcement
app.use(securityHeaders); // Additional security headers
app.use(ipThrottling); // IP-based throttling for DDoS protection

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(express.json({ limit: '10kb' })); // Body parser with limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is not set. Please configure it before running the server.');
    process.exit(1);
}

const MongoStore = require('connect-mongo').default;

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Ensured session is created early for CAPTCHA
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    name: 'sessionId', // Custom cookie name
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // Prevents XSS-based cookie theft
        sameSite: 'lax', // Relaxed for cross-port development (localhost:5173 to localhost:3001)
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        path: '/'
    }
}));

// Session security middleware
app.use(deviceFingerprint); // Device fingerprinting for session binding
app.use(sessionActivityTimeout); // Auto-logout on inactivity

// CSRF Protection - Using cookie-based tokens to avoid session timing issues
const csrf = require('csurf');
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
});

// CSRF token endpoint (must be before protected routes)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const mongoose = require('mongoose');
    
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    };

    // Check database connection
    try {
        if (mongoose.connection.readyState === 1) {
            health.database = 'connected';
        } else {
            health.database = 'disconnected';
            health.status = 'degraded';
        }
    } catch (error) {
        health.database = 'error';
        health.status = 'unhealthy';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 500;
    res.status(statusCode).json(health);
});

// API info route
app.get('/', (req, res) => {
    res.json({
        name: 'Pizza Ordering System API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/docs',
        health: '/health',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            categories: '/api/categories',
            cart: '/api/cart',
            orders: '/api/orders',
            payments: '/api/payments'
        }
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        version: '1.0.0',
        baseUrl: '/api',
        authentication: 'Session-based with CSRF protection',
        endpoints: {
            auth: {
                'POST /auth/register': 'Register new user',
                'POST /auth/login': 'Login user',
                'POST /auth/logout': 'Logout user',
                'GET /auth/captcha': 'Get CAPTCHA',
                'GET /auth/profile': 'Get user profile',
                'POST /auth/verify-email': 'Verify email with OTP'
            },
            products: {
                'GET /products': 'Get all products',
                'GET /products/:id': 'Get product by ID',
                'POST /products': 'Create product (admin only)',
                'PUT /products/:id': 'Update product (admin only)',
                'DELETE /products/:id': 'Delete product (admin only)'
            },
            categories: {
                'GET /categories': 'Get all categories',
                'POST /categories': 'Create category (admin only)'
            },
            cart: {
                'GET /cart': 'Get user cart',
                'POST /cart/add': 'Add item to cart',
                'PUT /cart/update': 'Update cart item',
                'DELETE /cart/remove/:productId': 'Remove item from cart',
                'DELETE /cart/clear': 'Clear cart'
            },
            orders: {
                'GET /orders': 'Get user orders',
                'GET /orders/:id': 'Get order by ID',
                'POST /orders': 'Create new order'
            },
            payments: {
                'POST /payments/process': 'Process payment',
                'POST /payments/create-intent': 'Create Stripe payment intent',
                'GET /payments/verify/:transactionId': 'Verify payment status'
            }
        },
        security: {
            csrf: 'CSRF token required for state-changing operations',
            rateLimit: 'Rate limiting applied per IP',
            authentication: 'Session-based authentication required for protected routes'
        }
    });
});

// Health check endpoint (for Docker and monitoring)
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(dbStatus === 'connected' ? 200 : 503).json({
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        const logger = require('./utils/logger');
        logger.security('CSRF token validation failed', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('user-agent')
        });
        return res.status(403).json({ 
            message: 'Invalid CSRF token. Please refresh the page.',
            errorCode: 'CSRF_VALIDATION_FAILED'
        });
    }
    next(err);
});

// Validation error handler
app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const logger = require('./utils/logger');
        logger.warn('Validation error', {
            path: req.path,
            errors: err.errors
        });
        return res.status(400).json({
            message: 'Validation failed',
            errors: Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            }))
        });
    }
    next(err);
});

// MongoDB error handler
app.use((err, req, res, next) => {
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        const logger = require('./utils/logger');
        logger.error('Database error', {
            code: err.code,
            message: err.message
        });

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(409).json({
                message: 'Duplicate entry. This record already exists.',
                errorCode: 'DUPLICATE_ENTRY'
            });
        }

        return res.status(500).json({
            message: process.env.NODE_ENV === 'production' 
                ? 'Database operation failed'
                : err.message
        });
    }
    next(err);
});

// JWT error handler
app.use((err, req, res, next) => {
    if (err.name === 'JsonWebTokenError') {
        const logger = require('./utils/logger');
        logger.security('Invalid JWT token', {
            ip: req.ip,
            path: req.path
        });
        return res.status(401).json({
            message: 'Invalid authentication token',
            errorCode: 'INVALID_TOKEN'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Authentication token expired',
            errorCode: 'TOKEN_EXPIRED'
        });
    }
    next(err);
});

// Rate limit error handler
app.use((err, req, res, next) => {
    if (err.status === 429) {
        const logger = require('./utils/logger');
        logger.security('Rate limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        return res.status(429).json({
            message: 'Too many requests. Please try again later.',
            errorCode: 'RATE_LIMIT_EXCEEDED'
        });
    }
    next(err);
});

// Global error handler
app.use((err, req, res, next) => {
    const logger = require('./utils/logger');
    
    // Log error with full context
    logger.error('Unhandled error', { 
        error: err.message, 
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.session?.userId
    });

    // Send appropriate response
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        errorCode: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Import and use routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');

// Routes (CSRF protection applied to state-changing operations)
app.use('/api/auth', authRoutes); // CSRF added per route in auth.routes.js
app.use('/api/products', productRoutes); // Read-only, no CSRF needed
app.use('/api/categories', categoryRoutes); // Read-only, no CSRF needed
app.use('/api/cart', csrfProtection, cartRoutes); // CSRF protected
app.use('/api/orders', csrfProtection, orderRoutes); // CSRF protected
app.use('/api/payments', csrfProtection, paymentRoutes); // CSRF protected

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        
        // Create indexes for production performance
        await createIndexes();

        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });

        // Prevent server from crashing on unhandled errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                process.exit(1);
            } else {
                console.error('Server error:', error);
            }
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('\nSIGINT signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to connect to the database. Server not started.', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in development to keep server running
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in development to keep server running
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

startServer();
