import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

/**
 * SectionHeader Component
 *
 * Renders a consistent header for content sections (e.g., "Recommended", "Favorites").
 * Includes a title and an optional "See All" action button to navigate to detailed views.
 * Can also function as a screen header if 'onBack' is provided.
 *
 * @param {Object} props
 * @param {string} props.title - The section title text.
 * @param {Function} props.onSeeAll - Handler for the "See All" button interaction.
 * @param {boolean} props.showSeeAll - Controls visibility of the "See All" button (default: true).
 * @param {Function} props.onBack - Optional handler for back navigation.
 */
const SectionHeader = ({ title, onSeeAll, showSeeAll = true, onBack }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles(colors).container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles(colors).backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      )}
      <Text style={[styles(colors).title, onBack && styles(colors).titleWithBack]}>{title}</Text>
      {showSeeAll && !onBack && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles(colors).seeAll}>{t('viewAll') || 'See all'}</Text>
        </TouchableOpacity>
      )}
      {/* Spacer if back button exists but no see all, to keep title centered or aligned */}
      {onBack && <View style={{ width: 24 }} />}
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22, // Explicitly set for consistency across devices (was fontSize.xl)
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    letterSpacing: 0.5, // Subtle spacing for headings
    includeFontPadding: false, // Fix Android vertical alignment
    lineHeight: 28,
  },
  titleWithBack: {
    marginLeft: spacing.sm,
    flex: 1, // Allow title to take remaining space
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  seeAll: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.primary,
  },
});

export default SectionHeader;
