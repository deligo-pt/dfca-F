import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const CategoryCard = ({ category, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: category.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{category.icon}</Text>
      <Text style={styles.name}>{category.name}</Text>
      <Text style={styles.description}>{category.description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    color: colors.text.white,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Regular',
    opacity: 0.9,
  },
});

export default CategoryCard;

