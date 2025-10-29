import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const LocationHeader = ({
  location,
  area,
  loading,
  errorMsg,
  onRefresh,
  onCartPress,
  onLocationPress,
  cartItemCount = 0,
  onSearch,
  searchQuery = ''  // Receive from parent as prop
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (text) => {
    onSearch && onSearch(text);
  };

  const clearSearch = () => {
    onSearch && onSearch('');
  };

  return (
    <View style={styles.container}>
      {/* Location Section */}
      <View style={styles.locationRow}>
        <TouchableOpacity
          style={styles.locationInfo}
          onPress={() => {
            console.log('📍 LocationHeader: Location area pressed');
            onLocationPress && onLocationPress();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.label}>Deliver to</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.white} />
          ) : errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : area ? (
            <View style={styles.addressContainer}>
              <Text style={styles.address} numberOfLines={1}>{area}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.text.white} style={{ marginLeft: 4 }} />
            </View>
          ) : (
            <Text style={styles.address}>Getting location...</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar & Cart Section */}
      <View style={styles.searchRow}>
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
            console.log('🛒 LocationHeader: Cart button pressed');
            onCartPress && onCartPress();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="cart-outline" size={24} color={colors.text.white} />
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  label: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Regular',
    opacity: 0.9,
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    color: colors.text.white,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  arrow: {
    color: colors.text.white,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    color: colors.text.white,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default LocationHeader;

