import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const CuisineChip = ({ cuisine, onPress, isSelected = false }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles(colors).container, isSelected && styles(colors).selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles(colors).icon}>{cuisine.image}</Text>
      <Text style={[styles(colors).name, isSelected && styles(colors).selectedText]}>{cuisine.name}</Text>
    </TouchableOpacity>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  icon: {
    fontSize: fontSize.lg,
    marginRight: spacing.xs,
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
  },
  selectedText: {
    color: colors.text.white,
  },
});

export default CuisineChip;

