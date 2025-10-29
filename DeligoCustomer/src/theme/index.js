import colors from './colors';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveBorderRadius,
  shadows,
  touchTargetSize,
  iconSizes,
  lineHeights,
  letterSpacing,
  normalize,
  getAdaptivePadding,
  isSmallDevice,
  isMediumDevice,
  isTablet,
} from '../utils/responsive';

export { colors };

// Base spacing (legacy support)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Base font sizes (legacy support)
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

// Base border radius (legacy support)
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

// Professional design tokens
export const designTokens = {
  // Responsive spacing that adapts to screen size
  spacing: responsiveSpacing,

  // Responsive font sizes with proper scaling
  fontSize: responsiveFontSize,

  // Responsive border radius
  borderRadius: responsiveBorderRadius,

  // Professional shadow presets
  shadows,

  // Accessibility-friendly touch targets
  touchTarget: touchTargetSize,

  // Consistent icon sizing
  iconSize: iconSizes,

  // Typography line heights
  lineHeight: lineHeights,

  // Letter spacing for headings
  letterSpacing,

  // Helper functions
  normalize,
  getAdaptivePadding,

  // Device detection
  isSmallDevice,
  isMediumDevice,
  isTablet,
};

export default {
  colors,
  spacing,
  fontSize,
  borderRadius,
  designTokens,
};

