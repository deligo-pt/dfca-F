// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  // Backwards-compatible aliases used across the codebase
  ACCESS_TOKEN: 'userToken',
  USER: 'userData',
  // Refresh token storage key
  REFRESH_TOKEN: 'refreshToken',
};

export default STORAGE_KEYS;
