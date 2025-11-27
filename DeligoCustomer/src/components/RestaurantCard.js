import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const RestaurantCard = ({ restaurant, onPress }) => {
  const { colors } = useTheme();

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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.86}
      onPress={() => onPress && onPress(restaurant)}
    >
      <Image source={imageSource} style={styles.heroImage} />

      <View style={styles.infoContainer}>
        <View style={styles.body}>
          <View style={styles.rowTop}>
            <View style={styles.nameContainer}>
              <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{vendorName}</Text>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                </View>
              )}
            </View>

            <View style={[styles.ratingPill, { backgroundColor: colors.primary }]}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={[styles.ratingPillText]}>{ratingValue !== null ? ` ${ratingValue}` : ' N/A'}</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            {tags.slice(0, 5).map((tag, i) => (
              <View key={`${tag}-${i}`} style={[styles.tag, { backgroundColor: colors.background === '#FFFFFF' ? '#F2F2F2' : 'rgba(255,255,255,0.03)' }]}>
                <Text style={[styles.tagText, { color: colors.text.secondary }]} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#eee',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginRight: 6,
  },
  verifiedBadge: {
    // Optional: for additional styling
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ratingPillText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
});

export default RestaurantCard;
