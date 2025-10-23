import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const RestaurantCard = ({ restaurant, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Text style={styles.image}>{restaurant.image}</Text>
        {restaurant.offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{restaurant.offer}</Text>
          </View>
        )}
        {restaurant.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.isPandaPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles.categories} numberOfLines={1}>
          {restaurant.categories.join(' • ')}
        </Text>

        <View style={styles.footer}>
          <View style={styles.infoRow}>
            <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.time}>{restaurant.deliveryTime}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.distance}>{restaurant.distance}</Text>
          </View>
          <Text style={[
            styles.deliveryFee,
            restaurant.deliveryFee === 'Free' && styles.freeDelivery
          ]}>
            {restaurant.deliveryFee}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F5F5F5',
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
  },
  newText: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: spacing.md,
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

