import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius } from '../../theme';
import { useTheme } from '../../utils/ThemeContext';

import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VendorType({ categories = [], onPress = () => { }, selectedId = null }) {
  const { colors } = useTheme();

  // Use emoji icons for reliable cross-platform rendering
  const getIcon = (name) => {
    const n = (name || '').toLowerCase().trim();
    console.log('[VendorType] getIcon for:', name, '-> normalized:', n);

    // Restaurant/Food matching
    if (n === 'resturent' || n === 'restaurant' || n.includes('food') || n.includes('burger')) {
      return '🍔'; // Food/Restaurant
    }
    // Store/Grocery matching
    if (n === 'store' || n.includes('grocery') || n.includes('shop') || n.includes('mart')) {
      return '🛒'; // Shopping Cart for Store
    }
    // Default fallback - always show something
    return '📦'; // Default package icon
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        return (
          <TouchableOpacity key={category.id} style={[styles(colors).card, isSelected && styles(colors).selected]} onPress={() => onPress(category)} activeOpacity={0.8}>
            <View style={[styles(colors).iconWrap, isSelected && styles(colors).iconWrapSelected]}>
              <Text style={styles(colors).iconEmoji}>{category.icon || getIcon(category.name)}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 70, // Fixed width for alignment
  },
  selected: {
    // No specific container style for selection in bubble mode, controlled by iconWrap
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35, // Fully circular
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant || colors.border || '#F5F5F5', // Soft gray/pastel background
    marginBottom: spacing.xs,
    // Removed overflow: hidden and elevation to fix Android shadow artifact
    // iOS shadow only
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    // NO elevation - it causes white square on Android
  },
  iconWrapSelected: {
    backgroundColor: colors.primaryLight || 'rgba(255, 105, 180, 0.15)', // Light primary tint
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconEmoji: {
    fontSize: 32, // Large emoji size
    textAlign: 'center',
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.xs + 1,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    numberOfLines: 2,
    lineHeight: 16,
  },
  nameSelected: {
    color: colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
});
