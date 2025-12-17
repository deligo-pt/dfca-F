import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, ScrollView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const StickySearchHeader = ({
  onCartPress,
  scrollY,
  onLocationPress,
  area,
  cartItemCount = 0,
  onSearchPress,
  paddingTop = 0,
  pointerEvents = 'auto',
}) => {
  const { colors, isDarkMode } = useTheme();

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles(colors, isDarkMode).wrapper, { opacity: headerOpacity }]}
      pointerEvents="box-none"
    >
      <View
        style={[styles(colors, isDarkMode).container, { paddingTop: paddingTop }]}
        pointerEvents={pointerEvents}
      >
        {/* Row 1: Location & Cart (Clean, Minimal) - Hidden when searching */}
        <View style={styles(colors, isDarkMode).topRow}>
          <TouchableOpacity
            style={styles(colors, isDarkMode).locationButton}
            onPress={onLocationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={14} color={colors.text.white || '#FFFFFF'} />
            <Text style={styles(colors, isDarkMode).locationText} numberOfLines={1}>
              {area || 'Set location'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.text.white || '#FFFFFF'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors, isDarkMode).cartButtonTop}
            onPress={onCartPress}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={20} color={colors.text.white || '#FFFFFF'} />
            {cartItemCount > 0 && (
              <View style={styles(colors, isDarkMode).badge}>
                <Text style={styles(colors, isDarkMode).badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 2: Search Bar (PROMINENT, CLEAN) */}
        <View style={styles(colors, isDarkMode).searchRow}>
          {/* Search Input - FULL WIDTH, CLEAN */}
          <TouchableOpacity
            style={styles(colors, isDarkMode).searchContainer}
            activeOpacity={0.9}
            onPress={onSearchPress}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.text.secondary}
              style={styles(colors, isDarkMode).searchIcon}
            />
            <Text style={[styles(colors, isDarkMode).input, { paddingVertical: 8, color: colors.text.secondary }]}>
              Search restaurants, cuisines...
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    </Animated.View>
  );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    // Fix for flicker: Solid background ensures no transparency during opacity transition
    backgroundColor: colors.primary,
  },
  container: {
    backgroundColor: colors.primary,
    // paddingTop handled via prop
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  // Row 1: Location & Cart - COMPACT
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    height: 28,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    color: colors.text.white || '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginLeft: 4,
    marginRight: 3,
    flex: 1,
  },
  cartButtonTop: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Row 2: Search - COMPACT
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainerFocused: {
    shadowOpacity: 0.15,
    elevation: 8,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    padding: 0,
    height: 32,
  },
  clearButton: {
    padding: spacing.xs - 2,
    marginLeft: spacing.xs,
  },
  // Badge - COMPACT
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFD700',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  // Suggestions Dropdown Wrapper & Container
  suggestionsWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  suggestionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 320,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight || 'rgba(255, 105, 180, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  suggestionCuisine: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
});

export default StickySearchHeader;

