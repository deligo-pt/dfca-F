import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const CuisineChip = ({ cuisine, onPress, isSelected = false }) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{cuisine.image}</Text>
      <Text style={[styles.name, isSelected && styles.selectedText]}>{cuisine.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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

