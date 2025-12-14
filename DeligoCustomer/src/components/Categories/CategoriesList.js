import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius } from '../../theme';
import { useTheme } from '../../utils/ThemeContext';

export default function VendorType({ categories = [], onPress = () => { }, selectedId = null }) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        return (
          <TouchableOpacity key={category.id} style={[styles(colors).card, isSelected && styles(colors).selected]} onPress={() => onPress(category)} activeOpacity={0.8}>
            <View style={[styles(colors).iconWrap, isSelected && styles(colors).iconWrapSelected]}>
              <Text style={styles(colors).icon}>🏪</Text>
            </View>
            <Text style={[styles(colors).name, isSelected && styles(colors).nameSelected]} numberOfLines={1}>{category.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginRight: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  iconWrapSelected: {
    backgroundColor: colors.onPrimary || colors.background,
  },
  icon: {
    fontSize: 18,
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    maxWidth: 120,
  },
  nameSelected: {
    color: colors.text.white,
  },
});
