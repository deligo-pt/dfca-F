import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

/**
 * CategoryCard Component
 *
 * Renders a visually distinct card for a specific food category or cuisine.
 * Designed to be colorful and eye-catching to encourage exploration.
 *
 * @param {Object} props
 * @param {Object} props.category - The category data object.
 * @param {string} props.category.name - Display name of the category.
 * @param {string} props.category.icon - Emoji or icon character.
 * @param {string} props.category.description - Short description or tagline.
 * @param {string} props.category.color - Background color hex code.
 * @param {Function} props.onPress - Handler for selection events.
 */
const CategoryCard = ({ category, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles(colors).container, { backgroundColor: category.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles(colors).icon}>{category.icon}</Text>
      <Text style={styles(colors).name}>{category.name}</Text>
      <Text style={styles(colors).description}>{category.description}</Text>
    </TouchableOpacity>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    width: 160,
    height: 140,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginRight: spacing.md,
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    fontSize: 40,
  },
  name: {
    color: colors.text.white || '#FFFFFF',
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text.white || '#FFFFFF',
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Regular',
    opacity: 0.9,
  },
});

export default CategoryCard;

