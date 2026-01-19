import axios from 'axios';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Log configuration in development
if (import.meta.env.DEV) {
    console.log('[API] Configuration:', {
        baseURL: API_URL,
        environment: import.meta.env.MODE
    });
}

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
});

// CSRF Token Management
let csrfToken = null;

/**
 * Initialize CSRF token by fetching from backend
 * Should be called on app startup
 */
export const initializeCSRF = async () => {
    try {
        const response = await api.get('/csrf-token');
        csrfToken = response.data.csrfToken;
        console.log('[CSRF] Token initialized successfully');
        return csrfToken;
    } catch (error) {
        console.error('[CSRF] Failed to fetch token:', error);
        return null;
    }
};

/**
 * Get current CSRF token
 */
export const getCSRFToken = () => csrfToken;

// Request Interceptor: Add CSRF token to all state-changing requests
api.interceptors.request.use(
    async config => {
        // Add CSRF token to POST, PUT, DELETE requests
        if (['post', 'put', 'delete'].includes(config.method.toLowerCase())) {
            // If token not available, try to fetch it first
            if (!csrfToken) {
                console.warn('[CSRF] Token not available, fetching now...');
                await initializeCSRF();
            }
            
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            } else {
                console.error('[CSRF] Failed to obtain token for request:', config.url);
                throw new Error('CSRF token not available. Please refresh the page.');
            }
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle errors globally
api.interceptors.response.use(
    response => response,
    async error => {
        // Handle CSRF token validation failures
        if (error.response?.status === 403 && 
            error.response?.data?.errorCode === 'CSRF_VALIDATION_FAILED') {
            console.warn('[CSRF] Token validation failed, refreshing token...');
            
            // Refresh CSRF token
            await initializeCSRF();
            
            // Retry the original request with new token
            if (csrfToken) {
                error.config.headers['X-CSRF-Token'] = csrfToken;
                return api.request(error.config);
            }
        }

        // Handle session expiration
        if (error.response?.status === 401) {
            console.warn('[Auth] Session expired or unauthorized');
            // Clear local auth state if needed
            localStorage.removeItem('user');
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
            console.warn('[Rate Limit] Too many requests');
            error.userMessage = 'Too many requests. Please try again in a few minutes.';
        }

        // Handle network errors
        if (!error.response) {
            console.error('[Network] Request failed - no response received');
            error.userMessage = 'Network error. Please check your connection and try again.';
        }

        // Log errors in development
        if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
            console.error('[API Error]', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                data: error.response?.data
            });
        }
        
        return Promise.reject(error);
    }
);;

export default api;
