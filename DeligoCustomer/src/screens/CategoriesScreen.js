import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import {
  LocationHeader,
  SectionHeader,
  StickySearchHeader,
} from '../components';
import mockData from '../data/mockData.json';

// Add new component imports
import OfferModal from '../components/Categories/OfferModal';
import useLocationHook from '../components/Categories/useLocation';
import CategoriesList from '../components/Categories/CategoriesList';
import CuisinesList from '../components/Categories/CuisinesList';
import RestaurantsList from '../components/Categories/RestaurantsList';

const CategoriesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  // useLocationHook provides location, area, loading, error and helpers
  const { location, area, loading, errorMsg, getLocation, setLocation, setArea } = useLocationHook();
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Modal state for offer details
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Mock cart count - in real app, get from context/state
  const cartItemCount = 0;

  // Sample offer from API - set to null to test welcome greeting
  const activeOffer = {
    title: 'First Order Special! 🎉',
    subtitle: 'Get 50% OFF on your first order',
    code: 'DELIGO50',
    discount: '50%',
    action: 'navigate_to_offers', // or offer ID
  };

  // Featured shops can be loaded from API or mock data; using mock here
  const featuredShops = mockData.featuredShops || [];

  // User name for personalized greeting (from auth context in real app)
  const userName = null; // Set to user's name or null

  // Filter restaurants based on search query with null checks
  const filteredRestaurants = searchQuery.trim()
    ? (mockData.restaurants || []).filter(restaurant => {
        if (!restaurant) return false;
        const query = searchQuery.toLowerCase();
        const name = (restaurant.name || '').toLowerCase();
        const cuisine = (restaurant.cuisine || '').toLowerCase();
        const description = (restaurant.description || '').toLowerCase();
        return name.includes(query) || cuisine.includes(query) || description.includes(query);
      })
    : mockData.restaurants || [];

  // Generate autocomplete suggestions (top 5 matches)
  const searchSuggestions = searchQuery.trim()
    ? filteredRestaurants.slice(0, 5)
    : [];

  const handleSuggestionPress = (restaurant) => {
    console.log('Suggestion selected:', restaurant.name);
    setSearchQuery(''); // Clear search
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleCategoryPress = (category) => {
    console.log('Category pressed:', category.name);
  };

  const handleCuisinePress = (cuisine) => {
    setSelectedCuisine(selectedCuisine === cuisine.id ? null : cuisine.id);
  };

  const handleRestaurantPress = (restaurant) => {
    console.log('Restaurant pressed:', restaurant.name);
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  const handleCartPress = () => {
    console.log('🛒 CART BUTTON PRESSED - Navigating to Cart screen');
    navigation.navigate('Cart');
  };

  const handleLocationPress = () => {
    console.log('📍 LOCATION BUTTON PRESSED - Navigating to LocationAddress screen');
    // Navigate to parent stack to access LocationAddress screen
    const parentNav = navigation.getParent();
    if (parentNav) {
      console.log('✅ Parent navigator found, navigating to LocationAddress');
      parentNav.navigate('LocationAddress', {
        onSave: (addressData) => {
          console.log('💾 Address saved:', addressData);
          // Update the location when user saves address
          setArea(addressData.address);
          if (addressData.coordinates) {
            setLocation(addressData.coordinates);
          }
        },
      });
    } else {
      console.log('❌ Parent navigator not found, trying direct navigation');
      navigation.navigate('LocationAddress', {
        onSave: (addressData) => {
          console.log('💾 Address saved:', addressData);
          // Update the location when user saves address
          setArea(addressData.address);
          if (addressData.coordinates) {
            setLocation(addressData.coordinates);
          }
        },
      });
    }
  };

  const handleOfferPress = (offer) => {
    console.log('🎉 OFFER PRESSED:', offer);
    setSelectedOffer(offer);
    setOfferModalVisible(true);
  };

  const handleShopPress = (shop) => {
    console.log('🏪 SHOP PRESSED:', shop);
    if (shop === 'all') {
      // Navigate to all featured restaurants
      console.log('View all featured restaurants');
      // navigation.navigate('FeaturedRestaurants');
    } else {
      // Navigate to specific restaurant
      navigation.navigate('RestaurantDetails', { restaurant: shop });
    }
  };

  return (
    <SafeAreaView style={styles(colors).safeArea} edges={['top']}>
      {/* Sticky Search Header - appears on scroll */}
      <StickySearchHeader
        scrollY={scrollY}
        onCartPress={handleCartPress}
        onLocationPress={handleLocationPress}
        area={area}
        cartItemCount={cartItemCount}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        suggestions={searchSuggestions}
        onSuggestionPress={handleSuggestionPress}
      />

      <Animated.ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Location Header with Search - scrolls away */}
        <LocationHeader
          location={location}
          area={area}
          loading={loading}
          errorMsg={errorMsg}
          onCartPress={handleCartPress}
          onLocationPress={handleLocationPress}
          cartItemCount={cartItemCount}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          suggestions={searchSuggestions}
          onSuggestionPress={handleSuggestionPress}
          activeOffer={activeOffer}
          featuredShops={featuredShops}
          onOfferPress={handleOfferPress}
          onShopPress={handleShopPress}
          userName={userName}
        />

        {/* Categories Section */}
        <SectionHeader title={t('whatDoYouNeed')} showSeeAll={false} />
        <CategoriesList categories={mockData.categories} onPress={handleCategoryPress} />

        {/* Cuisines Section */}
        <SectionHeader
          title={t('cuisines')}
          onSeeAll={() => console.log('See all cuisines')}
        />
        <CuisinesList cuisines={mockData.cuisines} selectedCuisine={selectedCuisine} onPress={handleCuisinePress} />

        {/* Restaurants Section */}
        <SectionHeader
          title={searchQuery ? `Search Results (${filteredRestaurants.length})` : t('popularRestaurants')}
          onSeeAll={!searchQuery ? () => console.log('See all restaurants') : undefined}
        />
        <RestaurantsList restaurants={filteredRestaurants} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <OfferModal visible={offerModalVisible} onClose={() => setOfferModalVisible(false)} offer={selectedOffer} onApply={(o) => console.log('Apply offer:', o)} />
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  cuisinesContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  restaurantsContainer: {
    paddingTop: spacing.xs,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  noResultsText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default CategoriesScreen;
