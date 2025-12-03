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
import mockProductsRaw from '../data/mockData.json';

import OfferModal from '../components/Categories/OfferModal';
import useLocationHook from '../components/Categories/useLocation';
import RestaurantsList from '../components/Categories/RestaurantsList';
import { useCart } from '../contexts/CartContext';
import formatCurrency from '../utils/currency';

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

  // Cart counts from context
  const { cartsArray, cartItems } = useCart();
  const cartVendorsCount = (cartsArray && cartsArray.length) ? cartsArray.length : 0; // number of vendor carts
  const cartItemCount = cartItems ? cartItems.reduce((s, it) => s + (it.quantity || 0), 0) : 0; // total items across vendor carts

  // Sample offer from API - set to null to test welcome greeting
  const activeOffer = {
    title: 'First Order Special! 🎉',
    subtitle: 'Get 50% OFF on your first order',
    code: 'DELIGO50',
    discount: '50%',
    action: 'navigate_to_offers', // or offer ID
  };

  // Use products context for live data
  const { products, fetchProducts, loading: productsLoading, error: productsError, lastUpdated } = useProducts();
  const [refreshing, setRefreshing] = useState(false);
  // Local normalize function (same shape as ProductsContext.normalizeProduct)
  const localNormalize = (p) => {
    const vendor = p.vendor || {};
    return {
      _raw: p,
      id: p._id || p.productId || vendor.vendorId || `${Math.random().toString(36).slice(2)}`,
      image: vendor.storePhoto || (Array.isArray(p.images) && p.images[0]) || null,
      name: vendor.vendorName || p.name || 'Unknown',
      categories: Array.isArray(p.tags) ? p.tags : (p.category ? [p.category] : []),
      rating: (p.rating && (typeof p.rating === 'number' ? p.rating : p.rating.average)) || vendor.rating || 0,
      deliveryTime: p.deliveryTime || '',
      distance: p.distance || '',
      deliveryFee: (p.pricing && typeof p.pricing.price !== 'undefined') ? formatCurrency(p.pricing.currency || '', p.pricing.price) : '',
      offer: (p.pricing && p.pricing.discount) ? `${p.pricing.discount}% OFF` : null,
    };
  };

  // Initialize displayedProducts from bundled mock so UI is immediate and not empty
  const initialMockItems = (Array.isArray(mockProductsRaw) ? mockProductsRaw : (mockProductsRaw.data || mockProductsRaw.items || [])).map(p => localNormalize(p));
  const [displayedProducts, setDisplayedProducts] = useState(initialMockItems || []);
  // Cache TTL ms state (user selectable) - ensure it's declared before any effect or UI references
  const [cacheTtlMs, setCacheTtlMs] = useState(5 * 60 * 1000);

  // On mount attempt to read default cached products so we can display them instantly
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set('page', 1);
        qs.set('limit', 20);
        const cacheKey = `productsCache:${qs.toString()}`;
        const cached = await StorageService.getItem(cacheKey);
        if (!mounted) return;
        if (cached && Array.isArray(cached.items) && cached.items.length) {
          const norm = cached.items.map(localNormalize);
          setDisplayedProducts(norm);
        } else {
          // No cache found — fall back to bundled mock data so UI is instant
          try {
            const items = Array.isArray(mockProductsRaw) ? mockProductsRaw : (mockProductsRaw.data || mockProductsRaw.items || []);
            if (items && items.length) {
              setDisplayedProducts(items.map(localNormalize));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.debug('No default cache found on mount', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Featured shops derived from products (those with meta.isFeatured)
  const featuredShops = React.useMemo(() => {
    return (products || []).filter((p) => p._raw?.meta?.isFeatured);
  }, [products]);

  // User name for personalized greeting (from auth context in real app)
  const userName = null; // TODO: replace with real user name from auth when available

  // Use products from context as the source - do not include displayedProducts to avoid circular dependency
  const sourceProducts = React.useMemo(() => {
    return Array.isArray(products) && products.length ? products : [];
  }, [products]);

  // Derive vendor types (e.g. 'Resturent') from sourceProducts
  const vendorTypesFromProducts = React.useMemo(() => {
    const map = new Map();
    (sourceProducts || []).forEach((p) => {
      const rawVendor = (p._raw && p._raw.vendor) || p.vendor || {};
      const vendorType = rawVendor.vendorType;
      if (vendorType && String(vendorType).trim()) {
        const key = String(vendorType).trim();
        if (!map.has(key)) map.set(key, { id: key, name: key });
      }
    });
    return Array.from(map.values());
  }, [sourceProducts]);

  // Derive cuisines (product.category) from sourceProducts
  const cuisinesFromProducts = React.useMemo(() => {
    const map = new Map();
    (sourceProducts || []).forEach((p) => {
      const category = p._raw?.category || p.category || (Array.isArray(p.tags) && p.tags[0]) || null;
      if (category) {
        const key = typeof category === 'string' ? category : String(category);
        const prev = map.get(key) || { id: key, name: key, count: 0 };
        prev.count = (prev.count || 0) + 1;
        map.set(key, prev);
      }
    });
    return Array.from(map.values()).map((c) => ({ id: c.id, name: c.name, restaurants: c.count }));
  }, [sourceProducts]);

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

  // Load persisted TTL preference
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await StorageService.getItem('PRODUCTS_CACHE_TTL_MS');
        if (!mounted) return;
        if (typeof stored === 'number' && !isNaN(stored) && stored > 0) setCacheTtlMs(stored);
      } catch (e) {
        console.debug('Failed to read stored TTL', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const formatAgo = (ts) => {
    if (!ts) return 'never';
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  const setTtl = async (ms) => {
    try {
      await StorageService.setItem('PRODUCTS_CACHE_TTL_MS', ms);
      setCacheTtlMs(ms);
    } catch (e) {
      console.debug('Failed to persist TTL', e);
    }
  };

  const clearProductCache = async () => {
    try {
      setRefreshing(true);
      await StorageService.removeKeysByPrefix('productsCache:');
      // force refresh
      await fetchProducts({ page: 1, force: true });
    } catch (e) {
      console.debug('Failed to clear product cache', e);
    } finally {
      setRefreshing(false);
    }
  };

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
  }, [searchQuery, selectedVendorType, selectedCuisine, fetchProducts]);

  // Keep displayedProducts in sync with sourceProducts (cached/mock) and current filters
  useEffect(() => {
    // Use sourceProducts as the source - don't read displayedProducts to avoid infinite loop
    const filterSource = Array.isArray(sourceProducts) && sourceProducts.length ? sourceProducts : [];

    // If no valid source, don't update (keep existing displayedProducts)
    if (filterSource.length === 0) return;

    // If no filters selected, show all sourceProducts
    if (!selectedVendorType && !selectedCuisine) {
      setDisplayedProducts(filterSource);
      return;
    }

    // Otherwise filter locally from sourceProducts
    const filtered = filterSource.filter((p) => {
      const vendorType = p._raw?.vendor?.vendorType || p.vendor?.vendorType || null;
      const category = p._raw?.category || p.category || (Array.isArray(p.tags) && p.tags[0]) || null;
      return (!selectedVendorType || vendorType === selectedVendorType) && (!selectedCuisine || category === selectedCuisine);
    });

    setDisplayedProducts(filtered);
  }, [sourceProducts, selectedVendorType, selectedCuisine]);

  // --- NEW: produce a deduplicated + sorted list by vendorName ---
  // This ensures the restaurants list shows one entry per vendor (keyed by vendorName) and is sorted by vendorName.
  const displayedByVendor = React.useMemo(() => {
    try {
      const arr = Array.isArray(displayedProducts) ? displayedProducts : [];
      const map = new Map();
      for (const p of arr) {
        const vendorName = (p && (p._raw?.vendor?.vendorName || p.vendor?.vendorName || p.name)) || '';
        const key = String(vendorName || '').trim().toLowerCase();
        if (!map.has(key)) {
          // ensure the item exposes a consistent `name` used for sorting/display
          const item = { ...p, name: vendorName || (p && p.name) || '' };
          map.set(key, item);
        }
      }
      const list = Array.from(map.values());
      list.sort((a, b) => (String(a.name || '').localeCompare(String(b.name || ''))));
      return list;
    } catch (e) {
      // On any unexpected shape issues, fall back to raw displayedProducts
      return Array.isArray(displayedProducts) ? displayedProducts : [];
    }
  }, [displayedProducts]);

  const handleVendorTypePress = (vendor) => {
    const vendorId = vendor.id || vendor.name;
    const newSel = selectedVendorType === vendorId ? null : vendorId;
    setSelectedVendorType(newSel);
    if (newSel === null) setSelectedCuisine(null);
    persistSelection('selectedVendorType', newSel);
    if (newSel === null) persistSelection('selectedCuisine', null);

    // Filter using ONLY sourceProducts to avoid circular dependency
    const filterSource = Array.isArray(sourceProducts) ? sourceProducts : [];
    const filtered = filterSource.filter((p) => {
      const vendorType = p._raw?.vendor?.vendorType || p.vendor?.vendorType || null;
      return !newSel || vendorType === newSel;
    });

    // ALWAYS update displayedProducts (even if empty) to avoid flickering
    setDisplayedProducts(filtered);

    // Trigger a background refresh for the selected filter
    fetchProducts({ vendorType: newSel || undefined, category: undefined, page: 1 });
  };

  const handleCuisinePress = (cuisine) => {
    const cuisineId = cuisine.id || cuisine.name;
    const newSel = selectedCuisine === cuisineId ? null : cuisineId;
    setSelectedCuisine(newSel);
    persistSelection('selectedCuisine', newSel);

    // Filter using ONLY sourceProducts to avoid circular dependency
    const filterSource = Array.isArray(sourceProducts) ? sourceProducts : [];
    const filtered = filterSource.filter((p) => {
      const vendorType = p._raw?.vendor?.vendorType || p.vendor?.vendorType || null;
      const category = p._raw?.category || p.category || (Array.isArray(p.tags) && p.tags[0]) || null;
      return (!selectedVendorType || vendorType === selectedVendorType) && (!newSel || category === newSel);
    });

    // ALWAYS update displayedProducts (even if empty) to avoid flickering
    setDisplayedProducts(filtered);

    // Background refresh
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
        cartVendorsCount={cartVendorsCount}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        suggestions={searchSuggestions}
        onSuggestionPress={handleSuggestionPress}
      />

      {/* DEBUG + controls: show products context state and cache controls */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: 8 }}>
        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
          {(productsLoading && (!displayedProducts || displayedProducts.length === 0)) ? 'Loading products...' : `Products: ${displayedProducts ? displayedProducts.length : (products || []).length}`}{productsError ? ` • Error: ${String(productsError)}` : ''}
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: 11, marginTop: 4 }}>
           {`vendorTypes: ${debugVendorTypes || '<none>'}`}
         </Text>
         <Text style={{ color: colors.text.secondary, fontSize: 11 }}>
           {`cuisines: ${debugCuisines || '<none>'}`}
         </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 11 }}>{`Last updated: ${formatAgo(lastUpdated)}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setTtl(60 * 1000)} style={{ marginRight: 10 }}>
              <Text style={{ color: cacheTtlMs === 60 * 1000 ? colors.primary : colors.text.secondary }}>1m</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTtl(5 * 60 * 1000)} style={{ marginRight: 10 }}>
              <Text style={{ color: cacheTtlMs === 5 * 60 * 1000 ? colors.primary : colors.text.secondary }}>5m</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTtl(15 * 60 * 1000)} style={{ marginRight: 12 }}>
              <Text style={{ color: cacheTtlMs === 15 * 60 * 1000 ? colors.primary : colors.text.secondary }}>15m</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearProductCache}>
              <Text style={{ color: colors.primary, fontFamily: 'Poppins-SemiBold' }}>Clear cache</Text>
            </TouchableOpacity>
          </View>
        </View>
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
          cartVendorsCount={cartVendorsCount}
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
        {productsLoading && (!displayedProducts || displayedProducts.length === 0) ? (
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
        {productsLoading && (!displayedProducts || displayedProducts.length === 0) ? (
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
        {(!displayedProducts || displayedProducts.length === 0) ? (
          // Show subtle loading state when fetching, or empty state when truly no results
          productsLoading ? (
            // Skeleton loader - native feel like Uber Eats
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles(colors).skeletonCard}>
                  <View style={styles(colors).skeletonImage} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={[styles(colors).skeletonLine, { width: '70%', marginBottom: 8 }]} />
                    <View style={[styles(colors).skeletonLine, { width: '50%', height: 12 }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Empty state - only shown when not loading and truly no results
            <View style={styles(colors).noResultsContainer}>
              <Text style={styles(colors).noResultsText}>
                {selectedVendorType || selectedCuisine
                  ? (t('noRestaurantsInFilter') || 'No restaurants match your selection')
                  : (t('noRestaurantsFound') || 'No restaurants found')
                }
              </Text>
              <Text style={styles(colors).noResultsSubtext}>
                {selectedVendorType || selectedCuisine
                  ? (t('tryDifferentFilter') || 'Try a different category or cuisine')
                  : (t('tryAdjustingFilters') || 'Try adjusting filters or pull to refresh')
                }
              </Text>
              {(selectedVendorType || selectedCuisine) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedVendorType(null);
                    setSelectedCuisine(null);
                    persistSelection('selectedVendorType', null);
                    persistSelection('selectedCuisine', null);
                  }}
                  style={styles(colors).clearFiltersButton}
                >
                  <Text style={styles(colors).clearFiltersText}>{t('clearFilters') || 'Clear Filters'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        ) : (
          <RestaurantsList restaurants={displayedByVendor} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />
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
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  // Skeleton loader styles for native feel
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
});

export default CategoriesScreen;
