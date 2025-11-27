import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { spacing } from '../../theme';

export default function FeaturedShopsCarousel({ shops = [], onShopPress = () => {} }) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {shops.map((shop) => (
        <TouchableOpacity key={shop.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onShopPress(shop)}>
          <Image source={{ uri: shop.logo }} style={styles.logo} />
          <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{shop.name}</Text>
          <Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={1}>{shop.cuisine} • {shop.deliveryTime}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  card: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
});
