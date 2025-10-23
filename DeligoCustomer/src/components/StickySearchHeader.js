import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const StickySearchHeader = ({ onCartPress, scrollY, onLocationPress, area }) => {
  // Animate opacity based on scroll - starts after LocationHeader scrolls away
  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Disable pointer events when not visible
  const pointerEvents = scrollY.interpolate({
    inputRange: [80, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: headerOpacity }]}
      pointerEvents={headerOpacity._value < 0.5 ? 'none' : 'auto'}
    >
      <TouchableOpacity
        style={styles.locationBadge}
        onPress={() => {
          console.log('📍 StickySearchHeader: Location badge pressed');
          onLocationPress && onLocationPress();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {area || 'Set location'}
        </Text>
      </TouchableOpacity>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search for restaurants, cuisines..."
          placeholderTextColor={colors.text.light}
        />
      </View>
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => {
          console.log('🛒 StickySearchHeader: Cart button pressed');
          onCartPress && onCartPress();
        }}
      >
        <Text style={styles.cartIcon}>🛒</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>3</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg + spacing.sm,
    zIndex: 1000,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    maxWidth: 120,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    padding: 0,
  },
  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text.white,
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
});

export default StickySearchHeader;

