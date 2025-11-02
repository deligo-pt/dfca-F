import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const RestaurantCard = ({ restaurant, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles(colors).container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles(colors).imageContainer}>
        <Text style={styles(colors).image}>{restaurant.image}</Text>
        {restaurant.offer && (
          <View style={styles(colors).offerBadge}>
            <Text style={styles(colors).offerText}>{restaurant.offer}</Text>
          </View>
        )}
        {restaurant.isNew && (
          <View style={styles(colors).newBadge}>
            <Text style={styles(colors).newText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles(colors).content}>
        <View style={styles(colors).header}>
          <Text style={styles(colors).name} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.isPandaPro && (
            <View style={styles(colors).proBadge}>
              <Text style={styles(colors).proText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles(colors).categories} numberOfLines={1}>
          {restaurant.categories.join(' • ')}
        </Text>

        <View style={styles(colors).footer}>
          <View style={styles(colors).infoRow}>
            <Text style={styles(colors).rating}>⭐ {restaurant.rating}</Text>
            <Text style={styles(colors).dot}>•</Text>
            <Text style={styles(colors).time}>{restaurant.deliveryTime}</Text>
            <Text style={styles(colors).dot}>•</Text>
            <Text style={styles(colors).distance}>{restaurant.distance}</Text>
          </View>
          <Text style={[
            styles(colors).deliveryFee,
            restaurant.deliveryFee === 'Free' && styles(colors).freeDelivery
          ]}>
            {restaurant.deliveryFee}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background === '#FFFFFF' ? '#F5F5F5' : 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    fontSize: 60,
  },
  offerBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  offerText: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Bold',
  },
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newText: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  proBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  proText: {
    color: '#000',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  categories: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rating: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  dot: {
    fontSize: fontSize.sm,
    color: colors.text.light,
    marginHorizontal: spacing.xs,
  },
  time: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  distance: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  deliveryFee: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  freeDelivery: {
    color: colors.success,
    fontFamily: 'Poppins-Bold',
  },
});

export default RestaurantCard;

