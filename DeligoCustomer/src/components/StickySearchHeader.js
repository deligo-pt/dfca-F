import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const StickySearchHeader = ({
  onCartPress,
  scrollY,
  onLocationPress,
  area,
  cartItemCount = 0,
  onSearch,
  searchQuery = ''  // Receive from parent as prop
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Animate opacity based on scroll - starts after LocationHeader scrolls away
  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleSearchChange = (text) => {
    onSearch && onSearch(text);
  };

  const clearSearch = () => {
    onSearch && onSearch('');
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: headerOpacity }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.locationBadge}
        onPress={() => {
          console.log('📍 StickySearchHeader: Location badge pressed');
          onLocationPress && onLocationPress();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={14} color={colors.text.white} />
        <Text style={styles.locationText} numberOfLines={1}>
          {area || 'Set location'}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.text.white} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
        <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search restaurants, cuisines..."
          placeholderTextColor={colors.text.secondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => {
          console.log('🛒 StickySearchHeader: Cart button pressed');
          onCartPress && onCartPress();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="cart-outline" size={24} color={colors.text.white} />
        {cartItemCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
          </View>
        )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
    maxWidth: 120,
  },
  locationText: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
    marginLeft: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: colors.text.white,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    padding: 0,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.text.white,
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
});

export default StickySearchHeader;

