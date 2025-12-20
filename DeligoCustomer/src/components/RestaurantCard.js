import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const RestaurantCard = ({ restaurant, onPress }) => {
  const { colors, isDarkMode } = useTheme();

  // Accept either a mapped restaurant shape or raw product in restaurant._raw
  const p = restaurant && restaurant._raw ? restaurant._raw : restaurant || {};
  const vendor = p.vendor || {};

  const imageUrl = vendor.storePhoto || (Array.isArray(p.images) && p.images[0]) || null;
  const imageSource = imageUrl ? { uri: imageUrl } : require('../assets/images/logonew.png');

  const vendorName = vendor.vendorName || p.vendorName || p.name || 'Unknown';
  const isVerified = vendor.isVerified || false; // Assuming a isVerified flag

  // rating normalization (average may be nested)
  let ratingValue = null;
  if (vendor && typeof vendor.rating === 'number') ratingValue = vendor.rating;
  else if (p.rating && typeof p.rating === 'number') ratingValue = p.rating;
  else if (p.rating && typeof p.rating === 'object' && typeof p.rating.average === 'number') ratingValue = p.rating.average;

  // tags
  const tags = Array.isArray(p.tags) ? p.tags : (Array.isArray(p.tags) ? p.tags : (p.tags || []));

  // --- Reverse Geocoding for City ---
  const [dynamicCity, setDynamicCity] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchCity = async () => {
      // If we already have explicit text, skip
      if (vendor.city || vendor.address || vendor.town) return;

      const lat = p.latitude || vendor.latitude;
      const lng = p.longitude || vendor.longitude;

      if (lat && lng) {
        try {
          // Simple memory cache check (optional optimization could be global)
          // For now, rely on OS caching or check if redundant
          const res = await Location.reverseGeocodeAsync({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
          if (mounted && res && res.length > 0) {
            const addr = res[0];
            // Prefer city, then subregion (district), then region
            const foundCity = addr.city || addr.subregion || addr.region || addr.district || addr.name;
            if (foundCity) setDynamicCity(foundCity);
          }
        } catch (e) {
          // ignore geocode errors
        }
      }
    };
    fetchCity();
    return () => { mounted = false; };
  }, [vendor.city, vendor.address, p.latitude, p.longitude, vendor.latitude, vendor.longitude]);

  const displayCity = vendor.city || vendor.address || dynamicCity;

  return (
    <TouchableOpacity
      style={[styles(colors).card]}
      activeOpacity={0.92}
      onPress={() => onPress && onPress(restaurant)}
    >
      <View style={{ position: 'relative' }}>
        <Image source={imageSource} style={[styles(colors).heroImage]} resizeMode="cover" />

        {/* Floating Rating Badge (Bottom Left) */}
        {ratingValue !== null && (
          <View style={styles(colors).ratingPill}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles(colors).ratingPillText}>{` ${ratingValue}`}</Text>
          </View>
        )}

        {/* Floating Delivery Time Badge (Bottom Right) */}
        <View style={[styles(colors).deliveryPill]}>
          <Text style={styles(colors).deliveryPillText}>20-30 min</Text>
        </View>
      </View>

      <View style={styles(colors).infoContainer}>
        <View style={styles(colors).body}>
          <View style={styles(colors).rowTop}>
            <View style={styles(colors).nameContainer}>
              <Text style={styles(colors).name} numberOfLines={1}>{vendorName}</Text>
              {isVerified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
            </View>
          </View>

          {/* Subtitle Row: Delivery Fee • Tag • City */}
          <View style={styles(colors).tagsRow}>
            <Text style={styles(colors).tagText}>
              {tags[0] || 'Food'}
              {displayCity ? ` • ${displayCity}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors) => StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border || colors.surfaceVariant || '#f0f0f0',
  },
  infoContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginRight: 6,
    color: colors.text.primary,
  },
  verifiedBadge: {},
  ratingPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingPillText: {
    color: colors.text.primary,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  deliveryPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: colors.shadow || '#000',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  deliveryPillText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    color: colors.text.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tag: {
    marginRight: 6,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
});

export default RestaurantCard;

