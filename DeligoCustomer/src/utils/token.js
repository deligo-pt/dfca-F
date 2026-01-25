import StorageService from './storage';

/**
 * Token Accessor
 * 
 * Lightweight utility to retrieve access tokens.
 * Separated to prevent circular dependencies in the service layer.
 */
export const getAccessToken = async () => {
  try {
    const token = await StorageService.getAccessToken();
    if (!token) return null;
    // Return raw token string; prefix handling is responsibility of consumer
    return token;
  } catch (err) {
    console.warn('getAccessToken error', err);
    return null;
  }
};

// no default export to keep imports explicit
