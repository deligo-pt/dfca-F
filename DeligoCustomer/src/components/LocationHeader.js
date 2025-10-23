import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const LocationHeader = ({ location, area, loading, errorMsg, onRefresh, onCartPress, onLocationPress }) => {
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
              <Text style={styles.arrow}>▼</Text>
            </View>
          ) : (
            <Text style={styles.address}>Getting location...</Text>
          )}
        </TouchableOpacity>

      </View>

      {/* Search Bar & Cart Section */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer} pointerEvents="box-none">
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
            console.log('🛒 LocationHeader: Cart button pressed');
            onCartPress && onCartPress();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>3</Text>
          </View>
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

export default LocationHeader;

