/**
 * @format
 */

import StorageService from './storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { customerApi } from './api';

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
    // Backwards-compatible: `token` may be access token. Newer flows pass accessToken and refreshToken separately.
    const accessToken = token && typeof token === 'string' ? token : undefined;
    // If caller passed an object { accessToken, refreshToken }, handle that too
    let refreshToken;
    if (token && typeof token === 'object') {
      refreshToken = token.refreshToken;
    }

    if (accessToken !== undefined && accessToken !== null) {
      // Prefer dedicated helper if available
      if (StorageService.setAccessToken) await StorageService.setAccessToken(accessToken);
      else await StorageService.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }

    if (refreshToken !== undefined && refreshToken !== null) {
      if (StorageService.setRefreshToken) await StorageService.setRefreshToken(refreshToken);
      else await StorageService.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
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
    // Also clear refresh token if present
    await StorageService.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
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
  const payload = method === 'email' ? { email: identifier } : { contactNumber: identifier };
  return await customerApi.post('/auth/login-customer', payload);
};

/**
 * verifyOTP: wrapper for verifying OTP for mobile or email flows.
 * On success, it saves token+user via AuthService.login so app can persist session.
 */
export const verifyOTP = async (identifier, otp, method = 'mobile') => {
  const payload =
    method === 'email'
      ? { email: identifier, otp }
      : { contactNumber: identifier, otp };
  const response = await customerApi.post('/auth/verify-otp', payload);

  // Normalize different backend response shapes
  // Example backend returns: { message: 'CUSTOMER Email verified successfully', data: { accessToken, refreshToken } }
  const accessToken = response?.data?.accessToken || response?.accessToken || response?.token;
  const refreshToken = response?.data?.refreshToken || response?.refreshToken || null;
  const user = response?.data?.user || response?.user || null;

  // Build token payload: preserve backwards compatibility with string token
  let tokenPayload = undefined;
  if (accessToken && refreshToken) tokenPayload = { accessToken, refreshToken };
  else if (accessToken) tokenPayload = accessToken;
  else if (refreshToken) tokenPayload = { refreshToken };

  if (tokenPayload) {
    // Save token(s); user may be null in some flows
    await AuthService.login(user, tokenPayload);
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
 * getUserId: returns user ID from JWT token
 */
export const getUserId = async () => {
  try {
    const token = await AuthService.getAccessToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    // backend expects userId (prefixed with 'C-') for customer endpoints
    return payload.userId || payload.id || payload.sub || payload.customerId || null;
  } catch (err) {
    console.warn('getUserId error', err);
    return null;
  }
};

/**
 * logoutUser: calls backend logout endpoint with stored token and clears local storage
 */
export const logoutUser = async (tokenInput = null) => {
  try {
    // Read tokens (prefer tokenInput param if provided)
    const storedToken = tokenInput
      ? tokenInput
      : (StorageService.getAccessToken ? await StorageService.getAccessToken() : await StorageService.getItem(STORAGE_KEYS.ACCESS_TOKEN));

    const refreshToken = StorageService.getRefreshToken ? await StorageService.getRefreshToken() : await StorageService.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    // If we don't have any tokens, there's no point calling the API (it will just 401).
    // We'll let the finally block clean up local storage.
    if (!storedToken && !refreshToken) {
      console.log('[auth] No tokens found locally. Skipping API logout.');
      return { success: true, message: 'Logged out locally (no tokens found)' };
    }

    const raw = storedToken || '';
    const bearer = raw && raw.startsWith('Bearer ') ? raw : raw ? `Bearer ${raw}` : undefined;

    // helper to mask tokens for logs (dev-only)
    const mask = token => {
      try {
        if (!token) return null;
        const t = token.toString();
        if (t.length <= 12) return `${t.slice(0, 4)}...`;
        return `${t.slice(0, 8)}...${t.slice(-4)}`;
      } catch (e) {
        return null;
      }
    };

    console.log('[auth] logout using token (source):', tokenInput ? 'param' : 'storage', bearer ? 'Bearer [REDACTED]' : null);

    // helper to call endpoint variant
    const doAttempt = async (name, headersObj, bodyObj) => {
      try {
        console.warn('[auth] logout attempt START', { attempt: name, authHeader: headersObj?.Authorization ? (headersObj.Authorization.startsWith('Bearer ') ? 'Bearer [REDACTED]' : 'RAW [REDACTED]') : null, accessMask: mask(raw), refreshMask: mask(refreshToken), bodyKeys: bodyObj ? Object.keys(bodyObj) : null });
      } catch (e) { }

      try {
        const resp = await fetch(`${customerApi.defaults.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...headersObj,
          },
          body: bodyObj ? JSON.stringify(bodyObj) : null,
        });

        const status = resp.status;
        const text = await resp.text();
        let json;
        try { json = text ? JSON.parse(text) : null; } catch (_e) { json = { message: text }; }

        try { console.warn('[auth] logout attempt RESULT', { attempt: name, status, message: json?.message || null }); } catch (e) { }

        if (!resp.ok) {
          return { success: false, status, message: json?.message || resp.statusText, data: json, attempt: name };
        }
        return { success: true, status, data: json, attempt: name };
      } catch (err) {
        return { success: false, error: err.message || String(err), attempt: name };
      }
    };

    // Try the method that works with the current backend first (raw-header+body-refresh)
    // then fallback to other common patterns
    const attempts = [
      { name: 'raw-header+body-refresh', headers: raw ? { Authorization: raw } : {}, body: refreshToken ? { refreshToken, token: refreshToken } : null },
      { name: 'bearer-header+body-refresh', headers: bearer ? { Authorization: bearer } : {}, body: refreshToken ? { refreshToken, token: refreshToken } : null },
      { name: 'no-header+body-refresh', headers: {}, body: refreshToken ? { refreshToken } : null },
      { name: 'bearer-header+x-refresh', headers: bearer ? { Authorization: bearer, 'x-refresh-token': refreshToken } : { 'x-refresh-token': refreshToken }, body: null },
      { name: 'body-accessToken', headers: {}, body: raw ? { accessToken: raw } : null },
      { name: 'body-token-access', headers: {}, body: raw ? { token: raw } : null },
      { name: 'body-both', headers: {}, body: { accessToken: raw, refreshToken, token: refreshToken } },
    ];

    let lastErr = null;
    for (let a of attempts) {
      const res = await doAttempt(a.name, a.headers, a.body);
      if (res.success) {
        return res;
      }
      if (res.status === 401) {
        console.warn('[auth] logout attempt', a.name, 'returned 401');
        lastErr = res;
        continue;
      }
      // For other errors, return immediately
      return res;
    }

    return lastErr || { success: false, message: 'Logout failed after retries' };
  } catch (err) {
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

/**
 * resendOTP: wrapper for resending OTP for mobile or email.
 * @param {string} identifier mobile number or email
 * @param {'mobile'|'email'} method
 */
export const resendOTP = async (identifier, method = 'mobile') => {
  const payload = method === 'email' ? { email: identifier } : { contactNumber: identifier };
  return await customerApi.post('/auth/resend-otp', payload);
};

// End of file
