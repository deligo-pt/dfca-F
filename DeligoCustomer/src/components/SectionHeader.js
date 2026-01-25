import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

/**
 * SectionHeader Component
 *
 * Renders a consistent header for content sections (e.g., "Recommended", "Favorites").
 * Includes a title and an optional "See All" action button to navigate to detailed views.
 *
 * @param {Object} props
 * @param {string} props.title - The section title text.
 * @param {Function} props.onSeeAll - Handler for the "See All" button interaction.
 * @param {boolean} props.showSeeAll - Controls visibility of the "See All" button (default: true).
 */
const SectionHeader = ({ title, onSeeAll, showSeeAll = true }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles(colors).container}>
      <Text style={styles(colors).title}>{title}</Text>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles(colors).seeAll}>{t('viewAll') || 'See all'}</Text>
        </TouchableOpacity>
      )}
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
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.primary,
  },
});

export default SectionHeader;
