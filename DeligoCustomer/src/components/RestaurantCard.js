import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocation } from '../contexts/LocationContext';
import { formatMinutesToUX } from '../utils/timeFormat';

/**
 * RestaurantCard Component — Premium Glassmorphism Edition
 * 
 * Features:
 * - Frosted glass info overlay floating on the hero image
 * - Premium shadow system with depth
 * - Refined typography & micro-interactions
 * - Elegant status badges with glass effect
 */
const RestaurantCard = ({ restaurant, onPress }) => {
  const { colors, isDarkMode } = useTheme();
  const { currentLocation } = useLocation();
  const [estimatedTime, setEstimatedTime] = React.useState(null);
  const [dynamicLocation, setDynamicLocation] = React.useState(null);

  // ---------------------------------------------------------------------------
  // Data Normalization
  // ---------------------------------------------------------------------------
  const refinedVendor = restaurant.vendor || {};
  const p = restaurant && restaurant._raw ? restaurant._raw : restaurant || {};
  const rawVendor = p.vendor || {};
  const rawVendorIdObj = (p.vendorId && typeof p.vendorId === 'object') ? p.vendorId : {};

  const mergedVendor = {
    ...rawVendor,
    ...rawVendorIdObj,
    ...refinedVendor,
  };

  const businessDetails = mergedVendor.businessDetails || {};

  // Resolve visual assets
  const imageUrl = mergedVendor.storePhoto || mergedVendor.logo || (Array.isArray(p.images) && p.images[0]) || null;
  const imageSource = imageUrl ? { uri: imageUrl } : require('../assets/images/logonew.png');

  // Resolve display name
  const vendorName = mergedVendor.vendorName || businessDetails.businessName || mergedVendor.businessName || p.vendorName || p.name || 'Unknown';
  const isVerified = mergedVendor.isVerified || false;

  // Resolve ratings safely (handle string numbers and nested averages)
  const extractRating = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val !== null) {
      if (val.average !== undefined) return extractRating(val.average);
      return null;
    }
    const num = Number(val);
    return !isNaN(num) ? num : null; // allow 0 exactly if it's explicitly 0
  };

  // Prioritize vendor's explicit rating over the wrapper product rating
  let ratingValue =
    extractRating(mergedVendor.rating) ||
    extractRating(restaurant.vendor?.rating) ||
    extractRating(p.vendorId?.rating) ||
    extractRating(businessDetails?.rating) ||
    extractRating(restaurant.rating) ||
    extractRating(p.rating) ||
    0;

  // Format to 1 decimal place if it's a valid number
  const isNew = ratingValue === 0;
  ratingValue = ratingValue > 0 ? Number(ratingValue).toFixed(1) : 0;

  // Resolve tags
  const rawTags = Array.isArray(p.tags) ? p.tags : (p.tags || []);
  const tags = rawTags.map(t => {
    if (typeof t === 'string') return t;
    if (t && typeof t === 'object') return t.name || t.slug || t.label || '';
    return '';
  }).filter(t => t);

  const deliveryTime = mergedVendor.deliveryTime || p.deliveryTime || null;

  // ---------------------------------------------------------------------------
  // Dynamic Delivery Time Calculation
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    const lat1 = currentLocation?.latitude;
    const lon1 = currentLocation?.longitude;
    const lat2 = mergedVendor.latitude || p.latitude;
    const lon2 = mergedVendor.longitude || p.longitude;

    if (lat1 && lon1 && lat2 && lon2) {
      // Haversine formula
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = R * c;

      // Base formula: 10 mins prep time + 3 mins per km (20km/h average city speed)
      const baseTime = Math.max(10, Math.round(distKm * 3) + 10);
      setEstimatedTime(`${baseTime} - ${baseTime + 5} min`);
    }
  }, [currentLocation, mergedVendor.latitude, mergedVendor.longitude, p.latitude, p.longitude]);

  // Priority: API dynamic calculation -> API static deliveryTime -> Fallback
  const finalDeliveryTime = formatMinutesToUX(estimatedTime || deliveryTime || '15 - 20 min');

  // ---------------------------------------------------------------------------
  // Location Logic
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      if (mergedVendor.city || mergedVendor.address || mergedVendor.town) return;

      const lat = mergedVendor.latitude || p.latitude;
      const lng = mergedVendor.longitude || p.longitude;

      if (lat && lng) {
        try {
          const res = await Location.reverseGeocodeAsync({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
          if (mounted && res && res.length > 0) {
            const addr = res[0];
            const area = addr.street || addr.district || addr.name || addr.subregion;
            const city = addr.city || addr.region;

            if (area && city && area !== city) {
              setDynamicLocation(`${area}, ${city}`);
            } else {
              setDynamicLocation(area || city);
            }
          }
        } catch (e) {
          // Fail silently on geocode errors
        }
      }
    };
    fetchLocation();
    return () => { mounted = false; };
  }, [mergedVendor.city, mergedVendor.address, p.latitude, p.longitude, mergedVendor.latitude, mergedVendor.longitude]);

  const displayLocation = mergedVendor.city || mergedVendor.address || dynamicLocation;
  const isStoreOpen = mergedVendor.isStoreOpen === true;

  const s = styles(colors, isDarkMode);

  return (
    <TouchableOpacity
      style={[s.card, !isStoreOpen && s.cardClosed]}
      activeOpacity={0.92}
      onPress={() => { if (isStoreOpen && onPress) onPress(restaurant); }}
      disabled={!isStoreOpen}
    >
      {/* Hero Image */}
      <View style={s.heroContainer}>
        <Image
          source={imageSource}
          style={[s.heroImage, !isStoreOpen && { opacity: 0.35 }]}
          resizeMode="cover"
        />

        {/* Gradient Overlay for readability */}
        <View style={s.heroGradient} />

        {/* Closed State */}
        {!isStoreOpen && (
          <View style={s.closedOverlay}>
            <View style={s.closedBadge}>
              <Ionicons name="moon-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.closedText}>Currently Closed</Text>
            </View>
          </View>
        )}

        {/* Glass Rating Badge */}
        {ratingValue !== null && isStoreOpen && (
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={11} color="#FFB800" />
            <Text style={s.ratingText}>{` ${ratingValue}`}</Text>
          </View>
        )}

        {/* Glass Delivery Time Badge */}
        {isStoreOpen && (
          <View style={s.deliveryBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" style={{ marginRight: 3 }} />
            <Text style={s.deliveryText}>{finalDeliveryTime}</Text>
          </View>
        )}
      </View>

      {/* Glassmorphism Info Overlay */}
      <View style={[s.glassInfo, !isStoreOpen && { opacity: 0.6 }]}>
        {/* Name Row */}
        <View style={s.nameRow}>
          <Text style={s.vendorName} numberOfLines={1}>{vendorName}</Text>
          {isVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Meta Row */}
        <View style={s.metaRow}>
          {tags[0] && (
            <View style={s.tagChip}>
              <Text style={s.tagChipText}>{tags[0]}</Text>
            </View>
          )}
          {displayLocation && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={12} color={isDarkMode ? '#aaa' : '#888'} />
              <Text style={s.locationText} numberOfLines={1}>{displayLocation}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
  // ── Card Shell ──
  card: {
    marginBottom: 20,
    marginHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',

    // Premium multi-layer shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,

    // Subtle glass border
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  },
  cardClosed: {
    opacity: 0.85,
  },

  // ── Hero Image ──
  heroContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border || '#f0f0f0',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: 'transparent',
    // Bottom fade for text readability
    ...Platform.select({
      ios: {
        // iOS doesn't render linear gradients via RN styles, so we use a semi-transparent overlay
      },
      android: {},
    }),
  },

  // ── Closed State ──
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closedText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    letterSpacing: 0.4,
  },

  // ── Glass Badges ──
  ratingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    // Glassmorphism: frosted pill
    backgroundColor: isDarkMode ? 'rgba(40,40,40,0.85)' : 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    // Shadow glow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingText: {
    color: isDarkMode ? '#fff' : '#1C1C1E',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
  },
  deliveryBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    // Glassmorphism: dark frosted pill on image
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deliveryText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Glassmorphism Info Panel ──
  glassInfo: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
    // Top inner border glow
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
  },

  // ── Name ──
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vendorName: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    letterSpacing: 0.15,
    flex: 1,
    marginRight: 6,
  },
  verifiedBadge: {
    marginLeft: 2,
  },

  // ── Meta Row ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChip: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: isDarkMode ? '#999' : '#777',
    marginLeft: 3,
    flex: 1,
  },
});

export default RestaurantCard;
