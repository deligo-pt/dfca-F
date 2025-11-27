import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import {
  LocationHeader,
  SectionHeader,
  StickySearchHeader,
} from '../components';
import VendorType from '../components/Categories/CategoriesList';
import Category from '../components/Categories/CuisinesList';
import { useProducts } from '../contexts/ProductsContext';
import StorageService from '../utils/storage';

// Add new component imports
import OfferModal from '../components/Categories/OfferModal';
import useLocationHook from '../components/Categories/useLocation';
import RestaurantsList from '../components/Categories/RestaurantsList';

const CategoriesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  // useLocationHook provides location, area, loading, error and helpers
  const { location, area, loading, errorMsg, getLocation, setLocation, setArea } = useLocationHook();
  const [selectedVendorType, setSelectedVendorType] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Session-persistent static lists
  const [staticVendorTypes, setStaticVendorTypes] = useState([]);
  const [staticCuisines, setStaticCuisines] = useState([]);
  const [sessionLoaded, setSessionLoaded] = useState(false);

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

  // Use products context for live data
  const { products, fetchProducts, loading: productsLoading, error: productsError } = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  // Featured shops derived from products (those with meta.isFeatured)
  const featuredShops = React.useMemo(() => {
    return (products || []).filter((p) => p._raw?.meta?.isFeatured);
  }, [products]);

  // User name for personalized greeting (from auth context in real app)
  const userName = null; // TODO: replace with real user name from auth when available

  // Derive vendor types (e.g. 'Resturent') from products' vendor.vendorType (computed but not used directly if static session exists)
  const vendorTypesFromProducts = React.useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      const rawVendor = (p._raw && p._raw.vendor) || p.vendor || {};
      const vendorType = rawVendor.vendorType;
      if (vendorType && String(vendorType).trim()) {
        const key = String(vendorType).trim();
        if (!map.has(key)) map.set(key, { id: key, name: key });
      }
    });
    return Array.from(map.values());
  }, [products]);

  // Derive cuisines (product.category) from products (computed but static session preferred)
  const cuisinesFromProducts = React.useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      const category = p._raw?.category || p.category || (Array.isArray(p.tags) && p.tags[0]) || null;
      if (category) {
        const key = typeof category === 'string' ? category : String(category);
        const prev = map.get(key) || { id: key, name: key, count: 0 };
        prev.count = (prev.count || 0) + 1;
        map.set(key, prev);
      }
    });
    return Array.from(map.values()).map((c) => ({ id: c.id, name: c.name, restaurants: c.count }));
  }, [products]);

  // Load session-stored static lists and selected filters on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedVendorTypes = await StorageService.getItem('vendorTypes');
        const storedCuisines = await StorageService.getItem('cuisines');
        const storedSelVendor = await StorageService.getItem('selectedVendorType');
        const storedSelCuisine = await StorageService.getItem('selectedCuisine');
        if (!mounted) return;
        // Normalize storedVendorTypes: accept ['A','B'] or [{id,name}] or {data: [...]}
        const normalizeList = (input) => {
          if (!input) return [];
          if (Array.isArray(input)) {
            // array of strings -> convert
            if (input.every(i => typeof i === 'string')) return input.map(s => ({ id: s, name: s }));
            // array of objects -> ensure id/name
            return input.map(i => (typeof i === 'string' ? { id: i, name: i } : { id: i.id || i.name || String(i), name: i.name || i.id || String(i) }));
          }
          // if object with data key
          if (input && typeof input === 'object') {
            const arr = input.data || input.items || input.list || null;
            if (Array.isArray(arr)) return normalizeList(arr);
          }
          return [];
        };

        const normVendor = normalizeList(storedVendorTypes);
        const normCuisines = normalizeList(storedCuisines);
        if (normVendor.length) setStaticVendorTypes(normVendor);
        if (normCuisines.length) setStaticCuisines(normCuisines);
         if (storedSelVendor) setSelectedVendorType(storedSelVendor);
         if (storedSelCuisine) setSelectedCuisine(storedSelCuisine);
      } catch (e) {
        console.debug('Failed to load session lists', e);
      } finally {
        if (mounted) setSessionLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When products arrive and session hasn't stored lists, persist derived lists as static session values
  useEffect(() => {
    if (!sessionLoaded) return; // wait until we've attempted to load session
    (async () => {
      try {
        if ((!staticVendorTypes || staticVendorTypes.length === 0) && vendorTypesFromProducts.length > 0) {
          setStaticVendorTypes(vendorTypesFromProducts);
          // store normalized array of objects
          await StorageService.setItem('vendorTypes', vendorTypesFromProducts.map(v => ({ id: v.id, name: v.name })));
        }
        if ((!staticCuisines || staticCuisines.length === 0) && cuisinesFromProducts.length > 0) {
          setStaticCuisines(cuisinesFromProducts);
          await StorageService.setItem('cuisines', cuisinesFromProducts.map(c => ({ id: c.id, name: c.name, restaurants: c.restaurants })));
        }
      } catch (e) {
        console.debug('Failed to persist session lists', e);
      }
    })();
  }, [sessionLoaded, products, vendorTypesFromProducts, cuisinesFromProducts]);

  // Use the static lists if available, otherwise fall back to computed lists
  const vendorTypes = Array.isArray(staticVendorTypes) && staticVendorTypes.length ? staticVendorTypes : (Array.isArray(vendorTypesFromProducts) ? vendorTypesFromProducts : []);
  const cuisines = Array.isArray(staticCuisines) && staticCuisines.length ? staticCuisines : (Array.isArray(cuisinesFromProducts) ? cuisinesFromProducts : []);

  // Debug values (now safe because cuisines is defined)
  const debugVendorTypes = Array.isArray(vendorTypes) ? vendorTypes.map(v => v?.name || '').filter(Boolean).slice(0,5).join(', ') : '';
  const debugCuisines = Array.isArray(cuisines) ? cuisines.map(c => c?.name || '').filter(Boolean).slice(0,5).join(', ') : '';

  // Persist user selections in session
  const persistSelection = async (key, value) => {
    try {
      // store null as null, strings as-is
      await StorageService.setItem(key, value === null ? null : value);
    } catch (e) { console.debug('Failed to persist selection', key, e); }
  };

  // Debounced search -> trigger context fetch
  useEffect(() => {
    const t = setTimeout(() => {
      // include selected filters when searching
      fetchProducts({ search: searchQuery, page: 1, vendorType: selectedVendorType || undefined, category: selectedCuisine || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, selectedVendorType, selectedCuisine]);

  const handleVendorTypePress = (vendor) => {
    const vendorId = vendor.id || vendor.name;
    const newSel = selectedVendorType === vendorId ? null : vendorId;
    setSelectedVendorType(newSel);
    if (newSel === null) setSelectedCuisine(null);
    persistSelection('selectedVendorType', newSel);
    if (newSel === null) persistSelection('selectedCuisine', null);
    // Fetch products filtered by vendorType
    fetchProducts({ vendorType: newSel || undefined, category: undefined, page: 1 });
  };

  const handleCuisinePress = (cuisine) => {
    const cuisineId = cuisine.id || cuisine.name;
    const newSel = selectedCuisine === cuisineId ? null : cuisineId;
    setSelectedCuisine(newSel);
    persistSelection('selectedCuisine', newSel);
    // Fetch products filtered by vendorType (if any) and category
    fetchProducts({ vendorType: selectedVendorType || undefined, category: newSel || undefined, page: 1 });
  };

  const handleRestaurantPress = (restaurant) => {
    console.log('Restaurant pressed:', restaurant.name);
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  // Suggestions based on current context products
  const filteredRestaurants = products || [];
  const searchSuggestions = searchQuery.trim() ? filteredRestaurants.slice(0, 5) : [];

  const handleSuggestionPress = (restaurant) => {
    console.log('Suggestion selected:', restaurant.name);
    setSearchQuery(''); // Clear search
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  useEffect(() => {
    getLocation();
  }, []);

  // Pull-to-refresh handler (calls fetchProducts with force to bypass TTL)
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchProducts({ page: 1, vendorType: selectedVendorType || undefined, category: selectedCuisine || undefined, force: true });
    } catch (e) {
      console.debug('handleRefresh failed', e);
    } finally {
      setRefreshing(false);
    }
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

      {/* DEBUG: show products context state (remove in production) */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: 6 }}>
        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
          {productsLoading ? 'Loading products...' : `Products: ${products.length}`}{productsError ? ` • Error: ${String(productsError)}` : ''}
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: 11, marginTop: 4 }}>
          {`vendorTypes: ${debugVendorTypes || '<none>'}`}
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: 11 }}>
          {`cuisines: ${debugCuisines || '<none>'}`}
        </Text>
      </View>

      <Animated.ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
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
        {productsLoading && (!Array.isArray(vendorTypes) || vendorTypes.length === 0) ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <VendorType categories={Array.isArray(vendorTypes) ? vendorTypes : []} onPress={handleVendorTypePress} selectedId={selectedVendorType} />
        )}

        {/* Cuisines Section */}
        <SectionHeader
          title={t('cuisines')}
          onSeeAll={() => console.log('See all cuisines')}
        />
        {productsLoading && (!Array.isArray(cuisines) || cuisines.length === 0) ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <Category cuisines={Array.isArray(cuisines) ? cuisines : []} selectedCuisine={selectedCuisine} onPress={handleCuisinePress} />
        )}

        {/* Restaurants Section */}
        <SectionHeader
          title={searchQuery ? `Search Results (${filteredRestaurants.length})` : t('popularRestaurants')}
          onSeeAll={!searchQuery ? () => console.log('See all restaurants') : undefined}
        />
        {productsLoading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (!products || products.length === 0) ? (
          <View style={styles(colors).noResultsContainer}>
            <Text style={styles(colors).noResultsText}>{t('noRestaurantsFound') || 'No restaurants found'}</Text>
            <Text style={styles(colors).noResultsSubtext}>{t('tryAdjustingFilters') || 'Try adjusting filters or retry.'}</Text>
            <TouchableOpacity onPress={() => fetchProducts({ page: 1, vendorType: selectedVendorType || undefined, category: selectedCuisine || undefined })} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.primary, fontFamily: 'Poppins-SemiBold' }}>{t('retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <RestaurantsList restaurants={products} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />
        )}

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
