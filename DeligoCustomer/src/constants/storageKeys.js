/**
 * Application Storage Constants
 * 
 * Central registry of keys used for AsyncStorage persistence.
 * Ensures consistent key usage across the app.
 */
export const STORAGE_KEYS = {
  // Onboarding Status
  ONBOARDING_COMPLETED: 'onboardingCompleted',

  // Authentication & Session
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  REFRESH_TOKEN: 'refreshToken',

  // Legacy Compatibility Mappings
  ACCESS_TOKEN: 'userToken',
  USER: 'userData',
};

export default STORAGE_KEYS;

