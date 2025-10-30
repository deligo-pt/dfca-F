import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';

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
  searchQuery = '',
  suggestions = [],
  onSuggestionPress,
  // New props for offers and shops
  activeOffer = null, // from API: { title, subtitle, code, discount, action: 'navigate_to_offers' }
  featuredShops = [], // from API: [{ id, name, logo, cuisine }]
  onOfferPress,
  onShopPress,
  userName = null, // for personalized greeting
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (text) => {
    onSearch && onSearch(text);
  };

  const clearSearch = () => {
    onSearch && onSearch('');
  };

  const handleSuggestionTap = (suggestion) => {
    onSuggestionPress && onSuggestionPress(suggestion);
    setIsSearchFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Deligo Logo/Brand */}
        {/*<View style={styles.logoRow}>*/}
        {/*  <Image*/}
        {/*    source={require('../assets/images/logo.png')}*/}
        {/*    style={styles.logoImage}*/}
        {/*    resizeMode="contain"*/}
        {/*  />*/}
        {/*</View>*/}

        {/* Row 1: Deliver To Location */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={onLocationPress}
            activeOpacity={0.7}
          >
            <Text style={styles.label}>Deliver to</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : (
              <View style={styles.locationContent}>
                <Ionicons name="location-sharp" size={14} color="#FFFFFF" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {area || 'Set location'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartButtonTop}
            onPress={onCartPress}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
            {cartItemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 2: Search Bar - NO BACK BUTTON (always visible header) */}
        <View style={styles.searchRow}>
          <View style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused
          ]}>
            <Ionicons
              name="search"
              size={18}
              color={isSearchFocused ? colors.primary : "#999999"}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#999999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic Promo Banner or Welcome Greeting */}
        {activeOffer ? (
          // Marketing-Centric Offer Banner
          <TouchableOpacity
            style={styles.promoBanner}
            activeOpacity={0.85}
            onPress={() => onOfferPress && onOfferPress(activeOffer)}
          >
            <View style={styles.promoLeft}>
              <View style={styles.promoLogoContainer}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles.promoLogo}
                  resizeMode="contain"
                />
                <View style={styles.sparkleEffect}>
                  <Text style={styles.sparkle}>✨</Text>
                </View>
              </View>
              <View style={styles.promoTextContainer}>
                <Text style={styles.promoTitle} numberOfLines={1}>
                  {activeOffer.title || 'Special Offer!'}
                </Text>
                <Text style={styles.promoSubtitle} numberOfLines={1}>
                  {activeOffer.subtitle || 'Limited time offer'}
                </Text>
                {activeOffer.code && (
                  <View style={styles.promoCodeBadge}>
                    <Text style={styles.promoCodeText}>{activeOffer.code}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.promoRight}>
              <Text style={styles.promoDiscount}>
                {activeOffer.discount || '50%'}
              </Text>
              <Text style={styles.promoOffText}>OFF</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={{ marginTop: 2 }} />
            </View>
          </TouchableOpacity>
        ) : (
          // Welcome Greeting (No Active Offer)
          <View style={styles.welcomeBanner}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>
                {userName ? `Welcome back, ${userName}! 👋` : 'Welcome to Deligo! 👋'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Discover amazing food near you
              </Text>
            </View>
          </View>
        )}

        {/* Featured Shops - Real Shop Logos */}
        {featuredShops && featuredShops.length > 0 && (
          <View style={styles.shopsSection}>
            <View style={styles.shopsSectionHeader}>
              <Text style={styles.shopsSectionTitle}>Featured Restaurants</Text>
              <TouchableOpacity onPress={() => onShopPress && onShopPress('all')}>
                <Text style={styles.viewAllShops}>View All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopsContainer}
            >
              {featuredShops.map((shop, index) => (
                <TouchableOpacity
                  key={shop.id || index}
                  style={styles.shopCard}
                  activeOpacity={0.8}
                  onPress={() => onShopPress && onShopPress(shop)}
                >
                  <View style={styles.shopLogoWrapper}>
                    {shop.logo ? (
                      <Image
                        source={{ uri: shop.logo }}
                        style={styles.shopLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.shopLogoPlaceholder}>
                        <Text style={styles.shopLogoText}>
                          {shop.name ? shop.name.charAt(0).toUpperCase() : '🍽️'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.shopName} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  {shop.cuisine && (
                    <Text style={styles.shopCuisine} numberOfLines={1}>
                      {shop.cuisine}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Autocomplete Suggestions Dropdown */}
      {isSearchFocused && searchQuery.length > 0 && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.id || index}
                style={[
                  styles.suggestionItem,
                  index === suggestions.length - 1 && styles.suggestionItemLast
                ]}
                onPress={() => handleSuggestionTap(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconWrapper}>
                  <Ionicons name="search" size={18} color={colors.primary} />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {suggestion.name}
                  </Text>
                  {suggestion.cuisine && (
                    <Text style={styles.suggestionCuisine} numberOfLines={1}>
                      {suggestion.cuisine}
                    </Text>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    backgroundColor: colors.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  // Logo Row
  logoRow: {
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 35,
  },
  // Row 1: Location & Cart - ALWAYS VISIBLE
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    minHeight: 32,
  },
  locationButton: {
    flex: 1,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 4,
    marginRight: 3,
    flex: 1,
  },
  errorText: {
    color: '#FFB3BA',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
  cartButtonTop: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Row 2: Search - NO BACK BUTTON
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: '#000',
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
    color: '#333333',
    padding: 0,
    height: 32,
  },
  clearButton: {
    padding: spacing.xs - 2,
    marginLeft: spacing.xs,
  },
  // Badge
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
    color: '#333333',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  // Suggestions Dropdown
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
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
    borderBottomColor: '#F5F5F5',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5F1',
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
    color: '#333333',
    marginBottom: 2,
  },
  suggestionCuisine: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  // Marketing-Centric Promo Banner Styles
  promoBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: spacing.md + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  promoLogoContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  promoLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sparkleEffect: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    fontSize: 12,
  },
  promoTextContainer: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  promoTitle: {
    fontSize: fontSize.md + 1,
    fontFamily: 'Poppins-Bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
    marginBottom: spacing.xs,
  },
  promoCodeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  promoCodeText: {
    fontSize: fontSize.xs + 1,
    fontFamily: 'Poppins-Black',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  promoRight: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
    minWidth: 75,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  promoDiscount: {
    fontSize: 28,
    fontFamily: 'Poppins-Black',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  promoOffText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginTop: -2,
  },
  // Welcome Greeting Styles (No Active Offer)
  welcomeBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: fontSize.md + 1,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  welcomeSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Featured Shops Section Styles
  shopsSection: {
    marginTop: spacing.xs,
  },
  shopsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm - 2,
  },
  shopsSectionTitle: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  viewAllShops: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  shopsContainer: {
    paddingRight: spacing.md,
  },
  shopCard: {
    alignItems: 'center',
    marginRight: spacing.sm + 2,
    width: 75,
  },
  shopLogoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.xs - 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  shopLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  shopLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  shopLogoText: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  shopName: {
    fontSize: fontSize.xs + 1,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  shopCuisine: {
    fontSize: fontSize.xs - 1,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

export default LocationHeader;

