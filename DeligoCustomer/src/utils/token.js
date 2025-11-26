import StorageService from './storage';

/**
 * Small helper to read token from storage.
 * Exported separately to avoid require cycles between auth and api layers.
 */
export const getAccessToken = async () => {
  try {
    const token = await StorageService.getAccessToken();
    if (!token) return null;
    // If token was saved without Bearer prefix, don't add it here; let callers decide.
    return token;
  } catch (err) {
    console.warn('getAccessToken error', err);
    return null;
  }
};

// no default export to keep imports explicit
