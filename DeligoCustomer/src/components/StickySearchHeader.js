/**
 * StickySearchHeader Component
 * 
 * A header component that becomes visible upon scrolling.
 * Provides easy access to location, cart, and search functions.
 * Uses animated opacity for smooth transitions based on scroll position.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, ScrollView, ActivityIndicator, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';


const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

/**
 * StickySearchHeader Component
 * 
 * Scroll-activated persistent header with quick access controls.
 * transitions opacity based on scroll position to provide seamless navigation.
 * 
 * @param {Object} props
 * @param {Animated.Value} props.scrollY - Scroll animation value.
 * @param {Function} props.onCartPress - Cart action handler.
 * @param {Function} props.onLocationPress - Location picker handler.
 * @param {string} props.area - Current location label.
 * @param {number} [props.cartItemCount=0] - Active cart items.
 * @param {Function} props.onSearchPress - Search action handler.
 * @param {number} [props.paddingTop=0] - SafeArea/Statusbar padding.
 * @param {string} [props.pointerEvents='auto'] - Touch event control.
 */
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
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.2)', 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: paddingTop + 50,
            zIndex: 1,
          }}
          pointerEvents="none"
        />

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
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.05)']}
              style={StyleSheet.absoluteFill}
              borderRadius={16}
            />
            <Ionicons name="cart-outline" size={18} color={colors.text.white || '#FFFFFF'} />
            {cartItemCount > 0 && (
              <View style={styles(colors, isDarkMode).badge}>
                <Text style={styles(colors, isDarkMode).badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles(colors, isDarkMode).searchRow}>
          <TouchableOpacity
            style={styles(colors, isDarkMode).searchContainerWrapper}
            activeOpacity={0.9}
            onPress={onSearchPress}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              style={styles(colors, isDarkMode).searchContainer}
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
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Upward Overlapping Curve */}
        <View style={styles(colors, isDarkMode).bottomCurve} />
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
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: colors.primary,
    paddingBottom: spacing.xl + 16, // Extra padding for the curve overlap
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    height: 38,
    zIndex: 2,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
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
  searchContainerWrapper: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -1,
    left: -10, // Prevent minor edge bleeding
    right: -10,
    height: 32,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
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

