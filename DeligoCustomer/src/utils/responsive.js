/**
 * Responsive Design Utilities
 * 
 * Provides scaling functions, breakpoints, and adaptive helpers for
 * building responsive UIs across different device sizes and types.
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

// Capture physical device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device size breakpoints
export const BREAKPOINTS = {
  small: 375,   // iPhone SE, small Android phones
  medium: 414,  // iPhone 11 Pro Max, standard phones
  large: 768,   // Tablets
  xlarge: 1024, // Desktop/Large Tablet
};

// Device categorization
export const isSmallDevice = SCREEN_WIDTH < BREAKPOINTS.small;
export const isMediumDevice = SCREEN_WIDTH >= BREAKPOINTS.small && SCREEN_WIDTH < BREAKPOINTS.large;
export const isTablet = SCREEN_WIDTH >= BREAKPOINTS.large;

// Responsive scaling functions
const scale = (size) => (SCREEN_WIDTH / BREAKPOINTS.medium) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size; // Reference: iPhone X
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Normalize font sizes across densities
export const normalize = (size) => {
  const newSize = moderateScale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

// Responsive spacing
export const responsiveSpacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

// Responsive font sizes
export const responsiveFontSize = {
  xs: normalize(12),
  sm: normalize(14),
  md: normalize(16),
  lg: normalize(18),
  xl: normalize(24),
  xxl: normalize(32),
  xxxl: normalize(40),
};

// Viewport percentage helpers
export const getResponsiveWidth = (percentage) => (SCREEN_WIDTH * percentage) / 100;
export const getResponsiveHeight = (percentage) => (SCREEN_HEIGHT * percentage) / 100;

// Adaptive card sizing
export const getCardWidth = () => {
  if (isTablet) return SCREEN_WIDTH * 0.45;
  if (isSmallDevice) return SCREEN_WIDTH * 0.85;
  return SCREEN_WIDTH * 0.9;
};

// Adaptive grid columns
export const getGridColumns = () => {
  if (isTablet) return 3;
  if (isSmallDevice) return 1;
  return 2;
};

// Adaptive padding
export const getAdaptivePadding = () => {
  if (isTablet) return responsiveSpacing.xl;
  if (isSmallDevice) return responsiveSpacing.sm;
  return responsiveSpacing.md;
};

// Elevation and Shadow presets
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Standardized border radii
export const responsiveBorderRadius = {
  sm: moderateScale(6),
  md: moderateScale(10),
  lg: moderateScale(14),
  xl: moderateScale(18),
  xxl: moderateScale(24),
  round: 999,
};

// Accessibility touch targets (min 44pt)
export const touchTargetSize = {
  small: 44,
  medium: 48,
  large: 56,
};

// Icon sizes
export const iconSizes = {
  xs: normalize(16),
  sm: normalize(20),
  md: normalize(24),
  lg: normalize(28),
  xl: normalize(32),
};

// Typography: Line heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

// Typography: Letter spacing
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
};

export default {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BREAKPOINTS,
  isSmallDevice,
  isMediumDevice,
  isTablet,
  normalize,
  responsiveSpacing,
  responsiveFontSize,
  responsiveBorderRadius,
  getResponsiveWidth,
  getResponsiveHeight,
  getCardWidth,
  getGridColumns,
  getAdaptivePadding,
  shadows,
  touchTargetSize,
  iconSizes,
  lineHeights,
  letterSpacing,
};

