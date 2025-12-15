import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';

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
  const { colors, isDarkMode } = useTheme();
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
    <View style={styles(colors, isDarkMode).wrapper}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles(colors, isDarkMode).container}>
        {/* Header Row: Greeting + Location + Icons */}
        <View style={styles(colors, isDarkMode).headerRow}>
          {/* Left side: Greeting and Location */}
          <View style={styles(colors, isDarkMode).leftSection}>
            <Text style={styles(colors, isDarkMode).greetingText}>Good Afternoon</Text>
            <TouchableOpacity
              style={styles(colors, isDarkMode).locationButton}
              onPress={onLocationPress}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.white || '#FFFFFF'} />
              ) : errorMsg ? (
                <Text style={styles(colors, isDarkMode).errorText}>{errorMsg}</Text>
              ) : (
                <View style={styles(colors, isDarkMode).locationContent}>
                  <Ionicons name="location-sharp" size={16} color={colors.text.white || '#FFFFFF'} />
                  <Text style={styles(colors, isDarkMode).locationText} numberOfLines={1}>
                    {area || 'Set location'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.text.white || '#FFFFFF'} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Right side: Notification and Profile Icons */}
          <View style={styles(colors, isDarkMode).rightSection}>
            <TouchableOpacity
              style={styles(colors, isDarkMode).iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text.white || '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors, isDarkMode).iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={24} color={colors.text.white || '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Search Bar - NO BACK BUTTON (always visible header) */}
        <View style={styles(colors, isDarkMode).searchRow}>
          <View style={[
            styles(colors, isDarkMode).searchContainer,
            isSearchFocused && styles(colors, isDarkMode).searchContainerFocused
          ]}>
            <Ionicons
              name="search"
              size={18}
              color={isSearchFocused ? colors.primary : colors.text.secondary}
              style={styles(colors, isDarkMode).searchIcon}
            />
            <TextInput
              style={styles(colors, isDarkMode).input}
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor={colors.text.secondary}
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
              <TouchableOpacity onPress={clearSearch} style={styles(colors, isDarkMode).clearButton}>
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic Promo Banner or Welcome Greeting */}
        {activeOffer ? (
          // Marketing-Centric Offer Banner
          <TouchableOpacity
            style={styles(colors, isDarkMode).promoBanner}
            activeOpacity={0.85}
            onPress={() => onOfferPress && onOfferPress(activeOffer)}
          >
            <View style={styles(colors, isDarkMode).promoLeft}>
              <View style={styles(colors, isDarkMode).promoLogoContainer}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles(colors, isDarkMode).promoLogo}
                  resizeMode="contain"
                />
                <View style={styles(colors, isDarkMode).sparkleEffect}>
                  <Text style={styles(colors, isDarkMode).sparkle}>✨</Text>
                </View>
              </View>
              <View style={styles(colors, isDarkMode).promoTextContainer}>
                <Text style={styles(colors, isDarkMode).promoTitle} numberOfLines={1}>
                  {activeOffer.title || 'Special Offer!'}
                </Text>
                <Text style={styles(colors, isDarkMode).promoSubtitle} numberOfLines={1}>
                  {activeOffer.subtitle || 'Limited time offer'}
                </Text>
                {activeOffer.code && (
                  <View style={styles(colors, isDarkMode).promoCodeBadge}>
                    <Text style={styles(colors, isDarkMode).promoCodeText}>{activeOffer.code}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles(colors, isDarkMode).promoRight}>
              <Text style={styles(colors, isDarkMode).promoDiscount}>
                {activeOffer.discount || '50%'}
              </Text>
              <Text style={styles(colors, isDarkMode).promoOffText}>OFF</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.white || '#FFFFFF'} style={{ marginTop: 2 }} />
            </View>
          </TouchableOpacity>
        ) : (
          // Welcome Greeting (No Active Offer)
          <View style={styles(colors, isDarkMode).welcomeBanner}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles(colors, isDarkMode).welcomeLogo}
              resizeMode="contain"
            />
            <View style={styles(colors, isDarkMode).welcomeTextContainer}>
              <Text style={styles(colors, isDarkMode).welcomeTitle}>
                {userName ? `Welcome back, ${userName}! 👋` : 'Welcome to Deligo! 👋'}
              </Text>
              <Text style={styles(colors, isDarkMode).welcomeSubtitle}>
                Discover amazing food near you
              </Text>
            </View>
          </View>
        )}

        {/* Featured Shops - Real Shop Logos */}
        {featuredShops && featuredShops.length > 0 && (
          <View style={styles(colors, isDarkMode).shopsSection}>
            <View style={styles(colors, isDarkMode).shopsSectionHeader}>
              <Text style={styles(colors, isDarkMode).shopsSectionTitle}>Featured Restaurants</Text>
              <TouchableOpacity onPress={() => onShopPress && onShopPress('all')}>
                <Text style={styles(colors, isDarkMode).viewAllShops}>View All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles(colors, isDarkMode).shopsContainer}
            >
              {featuredShops.map((shop, index) => (
                <TouchableOpacity
                  key={shop.id || index}
                  style={styles(colors, isDarkMode).shopCard}
                  activeOpacity={0.8}
                  onPress={() => onShopPress && onShopPress(shop)}
                >
                  <View style={styles(colors, isDarkMode).shopLogoWrapper}>
                    {shop.logo ? (
                      <Image
                        source={{ uri: shop.logo }}
                        style={styles(colors, isDarkMode).shopLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles(colors, isDarkMode).shopLogoPlaceholder}>
                        <Text style={styles(colors, isDarkMode).shopLogoText}>
                          {shop.name ? shop.name.charAt(0).toUpperCase() : '🍽️'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles(colors, isDarkMode).shopName} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  {shop.cuisine && (
                    <Text style={styles(colors, isDarkMode).shopCuisine} numberOfLines={1}>
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
        <View style={styles(colors, isDarkMode).suggestionsContainer}>
          <ScrollView
            style={styles(colors, isDarkMode).suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.id || index}
                style={[
                  styles(colors, isDarkMode).suggestionItem,
                  index === suggestions.length - 1 && styles(colors, isDarkMode).suggestionItemLast
                ]}
                onPress={() => handleSuggestionTap(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles(colors, isDarkMode).suggestionIconWrapper}>
                  <Ionicons name="search" size={18} color={colors.primary} />
                </View>
                <View style={styles(colors, isDarkMode).suggestionContent}>
                  <Text style={styles(colors, isDarkMode).suggestionName} numberOfLines={1}>
                    {suggestion.name}
                  </Text>
                  {suggestion.cuisine && (
                    <Text style={styles(colors, isDarkMode).suggestionCuisine} numberOfLines={1}>
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

const styles = (colors, isDarkMode) => StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingTop: 0,
    marginTop: 0,
  },
  container: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xs,
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
  // Header Row with Greeting, Location and Icons
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: spacing.sm,
    paddingTop: 0,
  },
  leftSection: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  greetingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    marginBottom: spacing.xs - 2,
    lineHeight: 20,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs - 2,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: colors.text.white || '#FFFFFF',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: spacing.xs,
    marginRight: spacing.xs - 2,
    maxWidth: 200,
    lineHeight: 18,
  },
  errorText: {
    color: '#FFB3BA',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
  // Row 2: Search - NO BACK BUTTON
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingTop: 0,
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
    color: colors.text.primary,
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  // Suggestions Dropdown
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
  // Marketing-Centric Promo Banner Styles
  promoBanner: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadow || '#000',
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
    color: colors.text.primary,
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
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
    color: colors.text.white || '#FFFFFF',
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
    color: colors.text.white || '#FFFFFF',
    lineHeight: 30,
  },
  promoOffText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white || '#FFFFFF',
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
    color: colors.text.white || '#FFFFFF',
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
    color: colors.text.white || '#FFFFFF',
  },
  viewAllShops: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white || '#FFFFFF',
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
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  shopLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  shopLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  shopLogoText: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  shopName: {
    fontSize: fontSize.xs + 1,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white || '#FFFFFF',
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

