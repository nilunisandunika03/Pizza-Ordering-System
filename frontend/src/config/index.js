/**
 * Environment Configuration
 * Access environment variables throughout the app
 */

export const config = {
    // API Configuration
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    
    // Stripe Configuration
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    
    // App Information
    appName: import.meta.env.VITE_APP_NAME || 'Pizza Ordering System',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Feature Flags
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    
    // Environment
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE
};

// Validate required configuration
const validateConfig = () => {
    const errors = [];

    if (!config.apiUrl) {
        errors.push('VITE_API_URL is not configured');
    }

    if (config.isProduction && !config.stripePublishableKey) {
        errors.push('VITE_STRIPE_PUBLISHABLE_KEY is required in production');
    }

    if (errors.length > 0) {
        console.error('❌ Configuration Errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        
        if (config.isProduction) {
            throw new Error('Invalid production configuration');
        }
    }
};

// Run validation
validateConfig();

// Log configuration in development
if (config.isDevelopment && config.enableDebug) {
    console.log('🔧 App Configuration:', config);
}

export default config;
