import { StyleSheet } from 'react-native';
import { designTokens } from '../theme';
import { colors } from '../theme';

/**
 * Professional UX Styles - Reusable Components
 * Import and use these pre-built professional styles across all screens
 */

export const professionalStyles = StyleSheet.create({
  // === CONTAINERS ===
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    flex: 1,
    paddingHorizontal: designTokens.getAdaptivePadding(),
  },

  scrollContent: {
    paddingBottom: designTokens.spacing.xxl,
  },

  // === HEADERS ===
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...designTokens.shadows.sm,
  },

  headerTitle: {
    fontSize: designTokens.fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.tight,
  },

  headerSubtitle: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
  },

  backButton: {
    width: designTokens.touchTarget.small,
    height: designTokens.touchTarget.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designTokens.borderRadius.md,
  },

  // === CARDS ===
  card: {
    backgroundColor: colors.surface,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...designTokens.shadows.md,
  },

  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    ...designTokens.shadows.lg,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  cardTitle: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.normal,
  },

  cardSubtitle: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
    marginTop: designTokens.spacing.xs,
  },

  // === BUTTONS ===
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: designTokens.borderRadius.lg,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    minHeight: designTokens.touchTarget.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...designTokens.shadows.md,
  },

  primaryButtonText: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
    letterSpacing: designTokens.letterSpacing.wide,
  },

  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: designTokens.borderRadius.lg,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    minHeight: designTokens.touchTarget.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },

  secondaryButtonText: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    letterSpacing: designTokens.letterSpacing.wide,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    minHeight: designTokens.touchTarget.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  outlineButtonText: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },

  // === INPUTS ===
  inputContainer: {
    marginBottom: designTokens.spacing.md,
  },

  inputLabel: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    marginBottom: designTokens.spacing.xs,
  },

  input: {
    backgroundColor: colors.surface,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: designTokens.touchTarget.medium,
  },

  inputFocused: {
    borderColor: colors.primary,
    ...designTokens.shadows.sm,
  },

  inputError: {
    borderColor: colors.error,
  },

  // === TEXT STYLES ===
  heading1: {
    fontSize: designTokens.fontSize.xxl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.tight,
    lineHeight: designTokens.fontSize.xxl * designTokens.lineHeight.tight,
  },

  heading2: {
    fontSize: designTokens.fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.tight,
    lineHeight: designTokens.fontSize.xl * designTokens.lineHeight.tight,
  },

  heading3: {
    fontSize: designTokens.fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.normal,
    lineHeight: designTokens.fontSize.lg * designTokens.lineHeight.normal,
  },

  bodyText: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    lineHeight: designTokens.fontSize.md * designTokens.lineHeight.normal,
  },

  bodyTextSecondary: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
  },

  caption: {
    fontSize: designTokens.fontSize.xs,
    fontFamily: 'Poppins-Regular',
    color: colors.text.light,
    lineHeight: designTokens.fontSize.xs * designTokens.lineHeight.normal,
  },

  // === STATES ===
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.xl,
  },

  loadingText: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginTop: designTokens.spacing.md,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.xxl,
  },

  emptyStateIcon: {
    fontSize: designTokens.isTablet ? 80 : 60,
    marginBottom: designTokens.spacing.md,
  },

  emptyStateTitle: {
    fontSize: designTokens.fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.relaxed,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: '#FFF5F5',
    borderRadius: designTokens.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
    marginBottom: designTokens.spacing.md,
  },

  errorText: {
    flex: 1,
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: '#C53030',
    marginLeft: designTokens.spacing.sm,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
  },

  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: '#F0FFF4',
    borderRadius: designTokens.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#48BB78',
    marginBottom: designTokens.spacing.md,
  },

  successText: {
    flex: 1,
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: '#2F855A',
    marginLeft: designTokens.spacing.sm,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
  },

  // === LISTS ===
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: designTokens.touchTarget.large,
  },

  listItemContent: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },

  listItemTitle: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    marginBottom: designTokens.spacing.xs,
  },

  listItemSubtitle: {
    fontSize: designTokens.fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: designTokens.fontSize.sm * designTokens.lineHeight.normal,
  },

  // === BADGES ===
  badge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.round,
    backgroundColor: colors.primary,
  },

  badgeText: {
    fontSize: designTokens.fontSize.xs,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
    letterSpacing: designTokens.letterSpacing.wide,
  },

  // === DIVIDERS ===
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: designTokens.spacing.md,
  },

  dividerThick: {
    height: 8,
    backgroundColor: colors.background,
    marginVertical: designTokens.spacing.sm,
  },

  // === SECTIONS ===
  sectionHeader: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: colors.background,
  },

  sectionTitle: {
    fontSize: designTokens.fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    letterSpacing: designTokens.letterSpacing.wide,
  },
});

export default professionalStyles;

