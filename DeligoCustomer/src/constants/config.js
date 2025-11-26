/**
 * @format
 * API Configuration for Deligo Customer Application
 * Central configuration for all API endpoints and base URLs.
 */

// Environment-based API Base URLs
const API_BASE_URLS = {
  // IMPORTANT: Change this to your computer's IP address for physical device/emulator testing
  // Find your IP: Windows (ipconfig) | Mac/Linux (ifconfig)
  // Android Emulator: Use 10.0.2.2 (maps to host machine's localhost)
  // iOS Simulator: Use localhost or your computer's IP
  // Physical Device: Use your computer's local network IP (e.g., 192.168.x.x)

  development: 'http://10.0.2.2:5000', // For Android Emulator (maps to host localhost)
  // development: 'http://192.168.1.100:5000',  // Uncomment and use your PC's IP for physical device
  // development: 'http://localhost:5000',  // For iOS Simulator only

  staging: 'https://staging-api.deligo.com',
  production: 'https://api.deligo.com',
};

// Current environment - Should be managed by build scripts or CI/CD
const ENVIRONMENT = 'development'; // 'development' | 'staging' | 'production'

// API Configuration
export const API_CONFIG = {
  BASE_URL: API_BASE_URLS[ENVIRONMENT],
  API_VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
};

// Construct full base URL for the API
// NOTE: backend routes are under /api/v1/... (no extra /customer segment)
// Use base URL without the trailing '/customer' so endpoints like '/auth/login-customer' resolve to '/api/v1/auth/login-customer'
export const BASE_API_URL = `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`;

// API Endpoint Categories for Customer App
export const API_ENDPOINTS = {
  // Authentication & User Account
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Customer Profile & Data
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile/update',
    ADDRESSES: '/profile/addresses',
    ADD_ADDRESS: '/profile/addresses/add',
    UPDATE_ADDRESS: '/profile/addresses/:addressId/update',
    DELETE_ADDRESS: '/profile/addresses/:addressId/delete',
    FAVORITES: '/profile/favorites',
  },

  // Restaurants & Menus
  RESTAURANTS: {
    LIST: '/restaurants',
    GET_DETAILS: '/restaurants/:id',
    GET_MENU: '/restaurants/:id/menu',
    SEARCH: '/restaurants/search',
    REVIEWS: '/restaurants/:id/reviews',
    ADD_REVIEW: '/restaurants/:id/reviews/add',
  },

  // Order Management
  ORDERS: {
    LIST: '/orders',
    GET_BY_ID: '/orders/:id',
    PLACE_ORDER: '/orders/place',
    CANCEL: '/orders/:id/cancel',
    TRACK: '/orders/:id/track',
    RATE: '/orders/:id/rate',
    HISTORY: '/orders/history',
  },

  // Cart Management
  CART: {
    GET: '/cart',
    ADD_ITEM: '/cart/add',
    UPDATE_ITEM: '/cart/update/:itemId',
    REMOVE_ITEM: '/cart/remove/:itemId',
    CLEAR: '/cart/clear',
  },

  // General & Utility
  UTIL: {
    SEARCH: '/search',
    CUISINES: '/cuisines',
    BANNERS: '/banners',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    SETTINGS: '/notifications/settings',
    UPDATE_SETTINGS: '/notifications/settings/update',
  },
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Request timeout configurations
export const TIMEOUT_CONFIG = {
  SHORT: 10000,   // 10 seconds - for quick operations
  MEDIUM: 30000,  // 30 seconds - default
  LONG: 60000,    // 60 seconds - for file uploads, etc.
};

// Default export for convenience
export default {
  API_CONFIG,
  BASE_API_URL,
  API_ENDPOINTS,
  HTTP_STATUS,
  TIMEOUT_CONFIG,
};
