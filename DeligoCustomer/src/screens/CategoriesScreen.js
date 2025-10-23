import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors, spacing } from '../theme';
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
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setArea(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location denied');
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
        setArea(areaString || 'Current Location');
      } else {
        setArea('Current Location');
      }
    } catch (error) {
      setErrorMsg('Error getting location');
      setArea('Set your location');
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
          onRefresh={getLocation}
          onCartPress={handleCartPress}
          onLocationPress={handleLocationPress}
        />

        {/* Categories Section */}
        <SectionHeader title="What do you need?" showSeeAll={false} />
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
          title="Cuisines"
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
          title="Popular Restaurants"
          onSeeAll={() => console.log('See all restaurants')}
        />
        <View style={styles.restaurantsContainer}>
          {mockData.restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={() => handleRestaurantPress(restaurant)}
            />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: spacing.xl }} />
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
});

export default CategoriesScreen;

