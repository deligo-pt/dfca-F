/**
 * CategoriesList Component
 * 
 * Displays a horizontally scrollable list of categories with selection support.
 * Handles item rendering with emoji fallbacks for missing icons.
 */
import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../../theme';
import { useTheme } from '../../utils/ThemeContext';

/**
 * Functional component for rendering the category strip.
 * 
 * @param {Object} props
 * @param {Array} props.categories - Array of category objects to display.
 * @param {Function} props.onPress - Handler for category selection. Receives the category object.
 * @param {string|number} props.selectedId - ID of the currently active category for highlighting.
 */
const CategoriesList = ({ categories = [], onPress = () => { }, selectedId = null }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  /**
   * Returns a fallback emoji based on category name keywords.
   * Used when no remote icon URL is provided by the API.
   * 
   * @param {string} name - Category name to analyze.
   * @returns {string} Emoji character.
   */
  const getIcon = (name) => {
    const normalizedName = (name || '').toLowerCase().trim();

    if (['resturent', 'restaurant', 'food', 'burger'].some(term => normalizedName.includes(term))) {
      return '🍔';
    }
    if (['store', 'grocery', 'shop', 'mart'].some(term => normalizedName.includes(term))) {
      return '🛒';
    }
    return '📦';
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={staticStyles.scrollContent}
    >
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.card, isSelected && styles.selected]}
            onPress={() => onPress(category)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
              <Text style={styles.iconEmoji}>{category.icon || getIcon(category.name)}</Text>
            </View>
            <Text
              style={[styles.name, isSelected && styles.nameSelected]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const staticStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});

const getStyles = (colors) => StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 70,
  },
  selected: {},
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant || colors.border || '#F5F5F5',
    marginBottom: spacing.xs,
    // Shadow for iOS
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    // Disable Android elevation to prevent artifacts
    elevation: 0,
  },
  iconWrapSelected: {
    backgroundColor: colors.primaryLight || 'rgba(255, 105, 180, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.xs + 1,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 16,
  },
  nameSelected: {
    color: colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default CategoriesList;

