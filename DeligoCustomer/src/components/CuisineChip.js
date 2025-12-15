import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const CuisineChip = ({ cuisine, onPress, isSelected = false }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <TouchableOpacity
      style={[styles(colors, isDarkMode).container, isSelected && styles(colors, isDarkMode).selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles(colors, isDarkMode).icon}>{cuisine.image}</Text>
      <Text style={[styles(colors, isDarkMode).name, isSelected && styles(colors, isDarkMode).selectedText]}>{cuisine.name}</Text>
    </TouchableOpacity>
  );
};

export default CuisineChip;

const styles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.surface : (colors.surfaceVariant || '#F0F2F5'),
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.sm,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  icon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
  },
  selectedText: {
    color: colors.text.white || '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
});

