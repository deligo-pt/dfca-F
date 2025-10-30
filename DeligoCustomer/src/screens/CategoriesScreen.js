import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import {
  LocationHeader,
  CategoryCard,
  CuisineChip,
  RestaurantCard,
  SectionHeader,
  StickySearchHeader,
} from '../components';
import mockData from '../data/mockData.json';

const CategoriesScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Modal state for offer details
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Mock cart count - in real app, get from context/state
  const cartItemCount = 0;

  // Sample offer from API - set to null to test welcome greeting
  const [activeOffer, setActiveOffer] = useState({
    title: 'First Order Special! 🎉',
    subtitle: 'Get 50% OFF on your first order',
    code: 'DELIGO50',
    discount: '50%',
    action: 'navigate_to_offers', // or offer ID
  });

  // Sample featured shops from API - Using open-source/public domain logos
  const [featuredShops, setFeaturedShops] = useState([
    {
      id: '1',
      name: 'Pizza Palace',
      logo: 'https://cdn-icons-png.flaticon.com/512/3132/3132691.png', // Pizza icon
      cuisine: 'Italian',
      rating: 4.5,
      deliveryTime: '25-30 min',
    },
    {
      id: '2',
      name: 'Burger House',
      logo: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png', // Burger icon
      cuisine: 'American',
      rating: 4.3,
      deliveryTime: '20-25 min',
    },
    {
      id: '3',
      name: 'Sushi Master',
      logo: 'https://cdn-icons-png.flaticon.com/512/1719/1719441.png', // Sushi icon
      cuisine: 'Japanese',
      rating: 4.7,
      deliveryTime: '30-35 min',
    },
    {
      id: '4',
      name: 'Taco Fiesta',
      logo: 'https://cdn-icons-png.flaticon.com/512/2553/2553691.png', // Taco icon
      cuisine: 'Mexican',
      rating: 4.4,
      deliveryTime: '25-30 min',
    },
    {
      id: '5',
      name: 'Cafe Deluxe',
      logo: 'https://cdn-icons-png.flaticon.com/512/924/924514.png', // Coffee icon
      cuisine: 'Cafe & Drinks',
      rating: 4.6,
      deliveryTime: '15-20 min',
    },
    {
      id: '6',
      name: 'Asian Wok',
      logo: 'https://cdn-icons-png.flaticon.com/512/2769/2769339.png', // Noodles icon
      cuisine: 'Asian',
      rating: 4.5,
      deliveryTime: '25-30 min',
    },
    {
      id: '7',
      name: 'Dessert Heaven',
      logo: 'https://cdn-icons-png.flaticon.com/512/3081/3081944.png', // Ice cream icon
      cuisine: 'Desserts',
      rating: 4.8,
      deliveryTime: '20-25 min',
    },
  ]);

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

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setArea(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(t('locationDenied'));
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      // Reverse geocode to get area name
      let address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address && address.length > 0) {
        const addr = address[0];
        const areaString = [addr.street, addr.city, addr.region]
          .filter(Boolean)
          .join(', ');
        setArea(areaString || t('currentLocation'));
      } else {
        setArea(t('currentLocation'));
      }
    } catch (error) {
      setErrorMsg(t('errorGettingLocation'));
      setArea(t('setYourLocation'));
    } finally {
      setLoading(false);
    }
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        style={styles.scrollView}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {mockData.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </ScrollView>

        {/* Cuisines Section */}
        <SectionHeader
          title={t('cuisines')}
          onSeeAll={() => console.log('See all cuisines')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisinesContainer}
        >
          {mockData.cuisines.map((cuisine) => (
            <CuisineChip
              key={cuisine.id}
              cuisine={cuisine}
              onPress={() => handleCuisinePress(cuisine)}
              isSelected={selectedCuisine === cuisine.id}
            />
          ))}
        </ScrollView>

        {/* Restaurants Section */}
        <SectionHeader
          title={searchQuery ? `Search Results (${filteredRestaurants.length})` : t('popularRestaurants')}
          onSeeAll={!searchQuery ? () => console.log('See all restaurants') : undefined}
        />
        <View style={styles.restaurantsContainer}>
          {filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onPress={() => handleRestaurantPress(restaurant)}
              />
            ))
          ) : searchQuery ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.noResultsText}>No restaurants found</Text>
              <Text style={styles.noResultsSubtext}>Try searching with different keywords</Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Offer Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={offerModalVisible}
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setOfferModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>🎉</Text>
              <Text style={styles.modalTitle}>
                {selectedOffer?.title || 'Special Offer'}
              </Text>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                {selectedOffer?.subtitle || 'Limited time offer'}
              </Text>

              {selectedOffer?.code && (
                <View style={styles.modalPromoCodeContainer}>
                  <Text style={styles.modalPromoCodeLabel}>Promo Code:</Text>
                  <View style={styles.modalPromoCode}>
                    <Text style={styles.modalPromoCodeText}>
                      {selectedOffer.code}
                    </Text>
                  </View>
                  <Text style={styles.modalCopyHint}>Tap to copy</Text>
                </View>
              )}

              <View style={styles.modalDiscountBadge}>
                <Text style={styles.modalDiscountText}>
                  {selectedOffer?.discount || '50%'}
                </Text>
                <Text style={styles.modalDiscountLabel}>OFF</Text>
              </View>

              <View style={styles.modalTerms}>
                <Text style={styles.modalTermsTitle}>Terms & Conditions:</Text>
                <Text style={styles.modalTermsText}>
                  • Valid for first-time users only{'\n'}
                  • Minimum order value: €20{'\n'}
                  • Not applicable with other offers{'\n'}
                  • Valid until: December 31, 2025
                </Text>
              </View>
            </View>

            {/* Modal Footer */}
            <TouchableOpacity
              style={styles.modalApplyButton}
              onPress={() => {
                setOfferModalVisible(false);
                // Navigate to menu or apply code
                console.log('Apply offer:', selectedOffer);
              }}
            >
              <Text style={styles.modalApplyButtonText}>Apply Offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  // Offer Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 10,
    maxHeight: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIcon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalPromoCodeContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalPromoCodeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
    marginBottom: spacing.xs,
  },
  modalPromoCode: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: spacing.xs,
  },
  modalPromoCodeText: {
    fontSize: 24,
    fontFamily: 'Poppins-Black',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  modalCopyHint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999999',
  },
  modalDiscountBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#FFD93D',
  },
  modalDiscountText: {
    fontSize: 48,
    fontFamily: 'Poppins-Black',
    color: colors.primary,
    lineHeight: 50,
  },
  modalDiscountLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  modalTerms: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
  },
  modalTermsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333333',
    marginBottom: spacing.xs,
  },
  modalTermsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  modalApplyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalApplyButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
});

export default CategoriesScreen;

