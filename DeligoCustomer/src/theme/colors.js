/**
 * Color Palette Configuration
 *
 * Defines the application's color schemes for both Light and Dark modes.
 * Ensures strict adherence to brand guidelines and accessible contrast ratios.
 */

// --- Default Light Theme ---
export const colors = {
  primary: '#DC3173',
  secondary: '#FF6B9D',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999',
    white: '#FFFFFF',
  },
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  border: '#E0E0E0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Light Theme Specification
 * Explicit export for theme switching logic.
 */
export const lightColors = {
  ...colors,
};

/**
 * Dark Theme Specification
 *
 * Tailored high-contrast dark mode palette.
 * Note: 'surface' uses #1E1E1E which is standard Material Design recommendation for dark surfaces.
 */
export const darkColors = {
  primary: '#DC3173',
  secondary: '#FF6B9D',
  background: '#121212',
  surface: '#1E1E1E',
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    light: '#808080',
    white: '#FFFFFF',
  },
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  border: '#333333',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export default colors;


