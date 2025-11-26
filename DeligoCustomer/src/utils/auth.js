/**
 * @format
 */

import StorageService from './storage';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {customerApi} from './api';

/**
 * A service for handling user authentication.
 */
const AuthService = {
  /**
   * Check if the user has completed onboarding.
   * @returns {Promise<boolean>} True if onboarding is complete, false otherwise.
   */
  async getOnboardingStatus() {
    return await StorageService.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  },

  /**
   * Mark onboarding as complete.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async setOnboardingStatus(status) {
    return await StorageService.setItem(
      STORAGE_KEYS.ONBOARDING_COMPLETED,
      status,
    );
  },

  /**
   * Save user data and token to storage.
   * @param {object} userData The user data to save.
   * @param {string} token The user token to save.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async login(userData, token) {
    // Only store user if provided (avoid storing undefined)
    if (userData !== undefined && userData !== null) {
      await StorageService.setItem(STORAGE_KEYS.USER, userData);
    }
    if (token !== undefined && token !== null) {
      await StorageService.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
    return true;
  },

  /**
   * Clear user data and token from storage.
   * @returns {Promise<void>}
   */
  async logout() {
    await StorageService.removeItem(STORAGE_KEYS.USER);
    await StorageService.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Get the current user.
   * @returns {Promise<object | null>} The current user, or null if not logged in.
   */
  async getUser() {
    return await StorageService.getItem(STORAGE_KEYS.USER);
  },

  /**
   * Get the user's access token.
   * @returns {Promise<string | null>} The access token, or null if not logged in.
   */
  async getAccessToken() {
    return await StorageService.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Check if the user is authenticated.
   * @returns {Promise<boolean>} True if the user is authenticated, false otherwise.
   */
  async isAuthenticated() {
    const token = await this.getAccessToken();
    return !!token;
  },
};

export default AuthService;

// --- Convenience named exports for UI usage ---

/**
 * sendOTP: wrapper for requesting OTP for mobile or email.
 * @param {string} identifier mobile number or email
 * @param {'mobile'|'email'} method
 */
export const sendOTP = async (identifier, method = 'mobile') => {
  if (method === 'email') {
    return await customerApi.post('/auth/login-customer', {email: identifier});
  }
  // mobile flow
  return await customerApi.post('/auth/send-otp', {mobile: identifier});
};

/**
 * verifyOTP: wrapper for verifying OTP for mobile or email flows.
 * On success, it saves token+user via AuthService.login so app can persist session.
 */
export const verifyOTP = async (identifier, otp, method = 'mobile') => {
  const payload =
    method === 'email'
      ? {email: identifier, otp}
      : {mobile: identifier, otp};
  const response = await customerApi.post('/auth/verify-otp', payload);

  // Normalize different backend response shapes
  // Example backend returns: { message: 'CUSTOMER Email verified successfully', data: { accessToken, refreshToken } }
  const accessToken = response?.data?.accessToken || response?.accessToken || response?.token;
  const user = response?.data?.user || response?.user || null;

  if (accessToken) {
    // Save token; user may be null in some flows
    await AuthService.login(user, accessToken);
  }

  return { ...response, accessToken, user };
};

/**
 * saveUserData: saves only user data (used by UI after confirmation)
 */
export const saveUserData = async user => {
  try {
    await StorageService.setUser
      ? StorageService.setUser(user)
      : StorageService.setItem(STORAGE_KEYS.USER, user);
    return true;
  } catch (err) {
    console.warn('saveUserData error', err);
    return false;
  }
};

// --- New helpers: getUserData and logoutUser ---

/**
 * getUserData: returns user object from storage
 */
export const getUserData = async () => {
  try {
    // StorageService provides getUser helper
    if (StorageService.getUser) return await StorageService.getUser();
    return await StorageService.getItem(STORAGE_KEYS.USER);
  } catch (err) {
    console.warn('getUserData error', err);
    return null;
  }
};

// Convenience: check if user is authenticated
export const isUserAuthenticated = async () => {
  try {
    return await AuthService.isAuthenticated();
  } catch (err) {
    console.warn('isUserAuthenticated error', err);
    return false;
  }
};

/**
 * logoutUser: calls backend logout endpoint with stored token and clears local storage
 */
export const logoutUser = async (tokenInput = null) => {
  try {
    // Use provided token if available, otherwise read from storage
    const storedToken = tokenInput
      ? tokenInput
      : (StorageService.getAccessToken ? await StorageService.getAccessToken() : await StorageService.getItem(STORAGE_KEYS.ACCESS_TOKEN));

    const authHeader = storedToken
      ? storedToken.startsWith('Bearer ')
        ? storedToken
        : `Bearer ${storedToken}`
      : null;

    console.log('[auth] logout using token (source):', tokenInput ? 'param' : 'storage', authHeader ? authHeader.replace(/\s.+/, ' [REDACTED]') : null);

    // Call the logout endpoint; send no body and include Authorization if present
    const config = authHeader ? { headers: { Authorization: authHeader } } : {};
    const resp = await customerApi.post('/auth/logout', undefined, config);
    console.log('[auth] logout response:', resp);

    return { success: true, status: 200, data: resp };
  } catch (err) {
    // Normalize error information
    console.warn('[auth] logout API error:', err);
    const status = err?.err?.statusCode || err?.status || err?.statusCode || (err?.response && err.response.status) || 0;
    let message = 'Logout failed';
    if (err?.errorSources && Array.isArray(err.errorSources) && err.errorSources.length) {
      message = err.errorSources[0].message || message;
    } else if (err?.message) {
      message = err.message;
    } else if (err?.err?.message) {
      message = err.err.message;
    }

    return { success: false, status, message, raw: err };
  } finally {
    // Clear local storage (token and user) regardless of API result to ensure the app is logged out locally
    try {
      await AuthService.logout();
    } catch (e) {
      console.warn('[auth] error clearing storage on logout:', e);
    }
  }
};
