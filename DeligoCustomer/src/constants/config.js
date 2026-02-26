/**
 * API Configuration
 *
 * Centralized configuration for API endpoints, base URLs, and environment settings.
 */

/**
 * Base URLs for different environments.
 */
const API_BASE_URLS = {
  // Local Development Targets
  development: 'http://10.0.2.2:5000', // Android Emulator (maps to host localhost)
  // development: 'http://192.168.1.100:5000',  // Physical Device (Use PC's local IP)
  // development: 'http://localhost:5000',  // iOS Simulator

  // Deployment Targets
  // staging: 'https://api-food.deligo.pt',
  staging: 'https://deligo-food-backend.vercel.app',
  production: 'https://api-food.deligo.pt',
};

/**
 * Current Environment
 * Change this value to switch between 'development', 'staging', and 'production' modes.
 */
const ENVIRONMENT = 'production';

/**
 * General API Settings
 */
export const API_CONFIG = {
  BASE_URL: API_BASE_URLS[ENVIRONMENT],
  API_VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds global timeout
};

/**
 * Base API URL Construction
 *
 * Dynamically constructs the full API base URL string.
 * Ensures clean path concatenation by removing trailing slashes before appending the version.
 * Result: {BASE_URL}/api/{API_VERSION}
 */
const cleanBaseUrl = API_CONFIG.BASE_URL.replace(/\/+$/, '');
export const BASE_API_URL = `${cleanBaseUrl}/api/${API_CONFIG.API_VERSION}`;

/**
 * API Endpoint Definitions
 *
 * Organized by domain feature for clarity and maintainability.
 * Use these constants throughout the app to prevent hardcoded path strings.
 */
export const API_ENDPOINTS = {
  // --- Authentication ---
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

  // --- User Profile ---
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    ADDRESSES: '/profile/addresses',
    ADD_ADDRESS: '/profile/addresses/add',
    UPDATE_ADDRESS: '/profile/addresses/:addressId/update',
    DELETE_ADDRESS: '/profile/addresses/:addressId/delete',
    FAVORITES: '/profile/favorites',
  },

  // --- Products Catalog ---
  PRODUCTS: {
    GET_ALL: '/products'
  },

  // --- Restaurants & Menus ---
  RESTAURANTS: {
    LIST: '/restaurants',
    GET_DETAILS: '/restaurants/:id',
    GET_MENU: '/restaurants/:id/menu',
    SEARCH: '/restaurants/search',
    REVIEWS: '/restaurants/:id/reviews',
    ADD_REVIEW: '/restaurants/:id/reviews/add',
  },

  // --- Order Management ---
  ORDERS: {
    LIST: '/orders',
    GET_BY_ID: '/orders/:id',
    CREATE_ORDER: '/orders/create-order',
    PLACE_ORDER: '/orders/place',
    CANCEL: '/orders/:id/cancel',
    TRACK: '/orders/:id/track',
    RATE: '/orders/:id/rate',
    HISTORY: '/orders/history',
  },

  // --- Ratings ---
  RATINGS: {
    CREATE: '/ratings/create-rating',
  },

  // --- Cart Operations ---
  CART: {
    GET: '/carts/view-cart',
    ADD_TO_CART: '/carts/add-to-cart',
    ACTIVATE_ITEM: '/carts/activate-item/:productId',
    DELETE_ITEM: '/carts/delete-item',
    UPDATE_QUANTITY: '/carts/update-quantity',
    UPDATE_ADDON_QUANTITY: '/carts/update-addon-quantity',
    CLEAR: '/carts/clear',
  },

  // --- Checkout Flow ---
  CHECKOUT: {
    CREATE: '/checkout',
  },

  // --- Payments ---
  PAYMENT: {
    CREATE_PAYMENT_INTENT: '/payment/stripe/create-payment-intent',
  },

  // --- Discounts & Offers ---
  COUPONS: {
    APPLY: '/coupons/apply-coupon',
    REMOVE: '/coupons/remove-coupon',
  },

  OFFERS: {
    LIST: '/offers',
    GET_APPLICABLE: '/offers/get-applicable-offer',
  },

  // --- Common Utilities ---
  UTIL: {
    SEARCH: '/search',
    CUISINES: '/cuisines',
    BANNERS: '/banners',
    BUSINESS_CATEGORIES: '/categories/businessCategory',
    PRODUCT_CATEGORIES: '/categories/productCategory',
  },

  // --- Notifications ---
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    SETTINGS: '/notifications/settings',
    UPDATE_SETTINGS: '/notifications/settings/update',
  },

  // --- Support Chat ---
  CHAT: {
    INIT: '/support/conversation',
    LIST: '/support/conversations',
    MESSAGES: '/support/conversations/:room/messages',
    READ: '/support/conversations/:room/read',
  },

  // --- Sponsorships ---
  SPONSORSHIPS: {
    GET_ALL: '/sponsorships',
  }
};

/**
 * Standard HTTP Status Codes
 */
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

/**
 * Timeout Constants (ms)
 *
 * Pre-defined durations for handling various network request scenarios.
 */
export const TIMEOUT_CONFIG = {
  SHORT: 10000,   // Quick checks / heartbeat
  MEDIUM: 30000,  // Standard API calls
  LONG: 60000,    // Heavy operations (uploads, complex reports)
};

export default {
  API_CONFIG,
  BASE_API_URL,
  API_ENDPOINTS,
  HTTP_STATUS,
  TIMEOUT_CONFIG,
};

