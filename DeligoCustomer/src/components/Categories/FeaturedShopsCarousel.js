import React from 'react';
import { ScrollView, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { spacing } from '../../theme';

/**
 * FeaturedShopsCarousel
 * 
 * Horizontal scroll view highlighting premium vendors.
 * Used on home/landing screens to drive traffic to key partners.
 * 
 * @param {Object} props
 * @param {Array} props.shops - List of vendor objects to display.
 * @param {Function} props.onShopPress - Card tap handler.
 */
const FeaturedShopsCarousel = ({ shops = [], onShopPress = () => { } }) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {shops.map((shop) => (
        <TouchableOpacity
          key={shop.id}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border }
          ]}
          onPress={() => onShopPress(shop)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: shop.logo }} style={styles.logo} />

          <Text
            style={[styles.name, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {shop.name}
          </Text>

          <Text
            style={[styles.meta, { color: colors.text.secondary }]}
            numberOfLines={1}
          >
            {[shop.cuisine, shop.deliveryTime].filter(Boolean).join(' • ')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

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
    justifyContent: 'flex-start',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  name: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

export default FeaturedShopsCarousel;

