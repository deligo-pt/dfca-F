import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const SectionHeader = ({ title, onSeeAll, showSeeAll = true }) => {
  const { colors } = useTheme();

  return (
    <View style={styles(colors).container}>
      <Text style={styles(colors).title}>{title}</Text>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles(colors).seeAll}>See all</Text>
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

