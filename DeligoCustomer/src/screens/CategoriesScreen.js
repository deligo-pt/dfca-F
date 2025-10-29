import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
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

  // Mock cart count - in real app, get from context/state
  const cartItemCount = 0;

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
});

export default CategoriesScreen;

