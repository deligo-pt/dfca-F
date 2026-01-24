import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const RestaurantCard = ({ restaurant, onPress }) => {
  const { colors, isDarkMode } = useTheme();

  // Accept either a mapped restaurant shape or raw product in restaurant._raw
  // If 'restaurant' comes from normalizeProduct, it has a 'vendor' object with name/type/etc.
  const refinedVendor = restaurant.vendor || {};
  const p = restaurant && restaurant._raw ? restaurant._raw : restaurant || {};

  // Fallback to raw vendor handling if normalized 'restaurant.vendor' is missing properties
  const rawVendor = p.vendor || {};
  const rawVendorIdObj = (p.vendorId && typeof p.vendorId === 'object') ? p.vendorId : {};

  // Merge sources: refined -> raw.vendorId object -> raw.vendor
  const mergedVendor = {
    ...rawVendor,
    ...rawVendorIdObj,
    ...refinedVendor,
  };

  // Also check businessDetails if present in merged source
  const businessDetails = mergedVendor.businessDetails || {};

  const imageUrl = mergedVendor.storePhoto || mergedVendor.logo || (Array.isArray(p.images) && p.images[0]) || null;
  const imageSource = imageUrl ? { uri: imageUrl } : require('../assets/images/logonew.png');

  // Name extraction order: businessName -> vendorName -> product name -> 'Unknown'
  const vendorName = mergedVendor.vendorName || businessDetails.businessName || mergedVendor.businessName || p.vendorName || p.name || 'Unknown';
  const isVerified = mergedVendor.isVerified || false;

  // rating normalization (average may be nested)
  let ratingValue = null;
  if (typeof mergedVendor.rating === 'number') ratingValue = mergedVendor.rating;
  else if (p.rating && typeof p.rating === 'number') ratingValue = p.rating;
  else if (p.rating && typeof p.rating === 'object' && typeof p.rating.average === 'number') ratingValue = p.rating.average;

  // tags
  const tags = Array.isArray(p.tags) ? p.tags : (Array.isArray(p.tags) ? p.tags : (p.tags || []));

  // --- Reverse Geocoding for Location ---
  const [dynamicLocation, setDynamicLocation] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      // If we already have explicit text, skip
      if (mergedVendor.city || mergedVendor.address || mergedVendor.town) return;

      const lat = mergedVendor.latitude || p.latitude;
      const lng = mergedVendor.longitude || p.longitude;

      if (lat && lng) {
        try {
          const res = await Location.reverseGeocodeAsync({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
          if (mounted && res && res.length > 0) {
            const addr = res[0];
            // Get specific area (neighborhood)
            const area = addr.street || addr.district || addr.name || addr.subregion;
            // Get city
            const city = addr.city || addr.region;
            // Combine: "Basabo, Dhaka" or just city if no area
            if (area && city && area !== city) {
              setDynamicLocation(`${area}, ${city}`);
            } else {
              setDynamicLocation(area || city);
            }
          }
        } catch (e) {
          // ignore geocode errors
        }
      }
    };
    fetchLocation();
    return () => { mounted = false; };
  }, [mergedVendor.city, mergedVendor.address, p.latitude, p.longitude, mergedVendor.latitude, mergedVendor.longitude]);

  const displayLocation = mergedVendor.city || mergedVendor.address || dynamicLocation;

  const isStoreOpen = mergedVendor.isStoreOpen === true;

  return (
    <TouchableOpacity
      style={[
        styles(colors).card,
        !isStoreOpen && { backgroundColor: isDarkMode ? '#333' : '#f0f0f0', opacity: 0.9 } // Optional: subtle gray effect for the whole card context
      ]}
      activeOpacity={0.92}
      onPress={() => {
        if (isStoreOpen && onPress) {
          onPress(restaurant);
        }
      }}
      disabled={!isStoreOpen}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={imageSource}
          style={[
            styles(colors).heroImage,
            !isStoreOpen && { opacity: 0.4 } // Dim the image if closed
          ]}
          resizeMode="cover"
        />

        {!isStoreOpen && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 14 }}>Vendor is closed now</Text>
            </View>
          </View>
        )}

        {/* Floating Rating Badge (Bottom Left) */}
        {ratingValue !== null && isStoreOpen && (
          <View style={styles(colors).ratingPill}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles(colors).ratingPillText}>{` ${ratingValue}`}</Text>
          </View>
        )}

        {/* Floating Delivery Time Badge (Bottom Right) */}
        {isStoreOpen && (
          <View style={[styles(colors).deliveryPill]}>
            <Text style={styles(colors).deliveryPillText}>20-30 min</Text>
          </View>
        )}
      </View>

      <View style={[styles(colors).infoContainer, !isStoreOpen && { opacity: 0.6 }]}>
        <View style={styles(colors).body}>
          <View style={styles(colors).rowTop}>
            <View style={styles(colors).nameContainer}>
              <Text style={styles(colors).name} numberOfLines={1}>{vendorName}</Text>
              {isVerified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
            </View>
          </View>

          {/* Subtitle Row: Tag • Location with icon */}
          <View style={styles(colors).tagsRow}>
            <Text style={styles(colors).tagText}>
              {tags[0] || 'Food'}
            </Text>
            {displayLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                <Ionicons name="location-outline" size={13} color={colors.text.secondary} />
                <Text style={[styles(colors).tagText, { marginLeft: 2 }]}>{displayLocation}</Text>
              </View>
            )}
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

