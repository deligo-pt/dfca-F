import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import {
    LocationHeader,
    SectionHeader,
    StickySearchHeader,
    SkeletonCategory,
} from '../components';
import VendorType from '../components/Categories/CategoriesList';
import Category from '../components/Categories/CuisinesList';
import { useProducts } from '../contexts/ProductsContext';
import StorageService from '../utils/storage';
import mockProductsRaw from '../data/mockData.json';

import OfferModal from '../components/Categories/OfferModal';
import RestaurantsList from '../components/Categories/RestaurantsList';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import { useProfile } from '../contexts/ProfileContext';
import formatCurrency from '../utils/currency';

const CategoriesScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

    // Use global LocationContext instead of local hook
    const {
        currentLocation,
        address,
        loading: locationLoading,
        error: locationError,
        getCurrentLocation
    } = useLocation();

    const [selectedVendorType, setSelectedVendorType] = useState(null);
    const [selectedCuisine, setSelectedCuisine] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollY = useRef(new Animated.Value(0)).current;

    // Session-persistent static lists
    const [staticVendorTypes, setStaticVendorTypes] = useState([]);
    const [staticCuisines, setStaticCuisines] = useState([]);
    const [sessionLoaded, setSessionLoaded] = useState(false);

    // Glovo-style static subcategories for each vendor type
    const RESTAURANT_CATEGORIES = [
        { id: 'pizza', name: 'Pizza', icon: '🍕' },
        { id: 'burger', name: 'Burgers', icon: '🍔' },
        { id: 'chinese', name: 'Chinese', icon: '🥡' },
        { id: 'indian', name: 'Indian', icon: '🍛' },
        { id: 'healthy', name: 'Healthy', icon: '🥗' },
        { id: 'desserts', name: 'Desserts', icon: '🍰' },
        { id: 'coffee', name: 'Coffee', icon: '☕' },
    ];

    const STORE_CATEGORIES = [
        { id: 'dairy', name: 'Dairy & Eggs', icon: '🥛' },
        { id: 'fruits', name: 'Fruits & Veg', icon: '🍎' },
        { id: 'snacks', name: 'Snacks', icon: '🍪' },
        { id: 'beverages', name: 'Beverages', icon: '🥤' },
        { id: 'frozen', name: 'Frozen', icon: '🧊' },
        { id: 'household', name: 'Household', icon: '🧹' },
        { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
    ];

    // Dynamic categories based on selected vendor type
    const dynamicCategories = React.useMemo(() => {
        const vendorName = (selectedVendorType || '').toLowerCase();
        if (vendorName.includes('resturent') || vendorName.includes('restaurant') || vendorName.includes('food')) {
            return RESTAURANT_CATEGORIES;
        }
        if (vendorName.includes('store') || vendorName.includes('grocery') || vendorName.includes('shop')) {
            return STORE_CATEGORIES;
        }
        // If no vendor selected, show combined or empty
        return [...RESTAURANT_CATEGORIES.slice(0, 3), ...STORE_CATEGORIES.slice(0, 3)];
    }, [selectedVendorType]);

    // Modal state for offer details
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);

    // Cart counts from context
    const { cartsArray, cartItems } = useCart();
    const cartVendorsCount = (cartsArray && cartsArray.length) ? cartsArray.length : 0; // number of vendor carts
    const cartItemCount = cartItems ? cartItems.reduce((s, it) => s + (it.quantity || 0), 0) : 0; // total items across vendor carts

    // Sample offer from API - set to null to test welcome greeting
    // Sample offer from API - set to null to test welcome greeting
    const activeOffer = null; /* {
        title: 'First Order Special!',
        subtitle: 'Get 50% OFF on your first order',
        code: 'DELIGO50',
        discount: '50%',
        action: 'navigate_to_offers', // or offer ID
    }; */

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

    // Initialize empty to allow Skeleton to show instantly
    // const initialMockItems = (Array.isArray(mockProductsRaw) ? mockProductsRaw : (mockProductsRaw.data || mockProductsRaw.items || [])).map(p => localNormalize(p));
    // const [displayedProducts, setDisplayedProducts] = useState(initialMockItems || []);
    const [displayedProducts, setDisplayedProducts] = useState([]);
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
                    // No cache found — do NOT fall back to bundled mock data.
                    // We want to show Skeleton Loader instead.
                    /*
                    try {
                        const items = Array.isArray(mockProductsRaw) ? mockProductsRaw : (mockProductsRaw.data || mockProductsRaw.items || []);
                        if (items && items.length) {
                            setDisplayedProducts(items.map(localNormalize));
                        }
                    } catch (e) {
                        // ignore
                    }
                    */
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

    // User name for personalized greeting (from auth context)
    const { user, fetchUserProfile } = useProfile();

    useEffect(() => {
        // Fetch fresh profile data when home screen loads to ensure name is available
        if (fetchUserProfile) fetchUserProfile();
    }, []);

    // Robust name extraction
    let userName = null;
    if (user) {
        // console.log('[CategoriesScreen] User object:', JSON.stringify(user, null, 2)); // Debug log
        if (typeof user.name === 'object' && user.name !== null) {
            userName = user.name.firstName || user.name.first || '';
            if (!userName && user.name.fullName) userName = user.name.fullName.split(' ')[0];
        } else if (typeof user.name === 'string') {
            userName = user.name;
        }

        if (!userName) userName = user.firstName;
        if (!userName) userName = user.fullName ? user.fullName.split(' ')[0] : '';
        if (!userName) userName = user.displayName;
        if (!userName && user.email) userName = user.email.split('@')[0];
    }

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

    // Derive cuisines from products, optionally filtered by selected vendorType
    const cuisinesForSelectedVendor = React.useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];
        for (const p of arr) {
            const vtRaw = p._raw?.vendor?.vendorType ?? p.vendor?.vendorType ?? null;
            const vt = vtRaw != null ? String(vtRaw).trim() : null;
            if (selectedVendorType && vt !== selectedVendorType) continue;
            const catRaw = p._raw?.category ?? p.category ?? (Array.isArray(p.tags) ? p.tags[0] : null);
            const cat = catRaw != null ? String(catRaw).trim() : null;
            if (!cat) continue;
            const rec = map.get(cat) || { id: cat, name: cat, restaurants: 0 };
            rec.restaurants += 1;
            map.set(cat, rec);
        }
        return Array.from(map.values());
    }, [sourceProducts, selectedVendorType]);

    // Derive cuisines (unfiltered) from sourceProducts
    const cuisinesFromProducts = React.useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];
        for (const p of arr) {
            const catRaw = p._raw?.category ?? p.category ?? (Array.isArray(p.tags) ? p.tags[0] : null);
            const cat = catRaw != null ? String(catRaw).trim() : null;
            if (!cat) continue;
            const rec = map.get(cat) || { id: cat, name: cat, restaurants: 0 };
            rec.restaurants += 1;
            map.set(cat, rec);
        }
        return Array.from(map.values());
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
                const baseCuisines = selectedVendorType ? cuisinesForSelectedVendor : cuisinesFromProducts;
                if ((!staticCuisines || staticCuisines.length === 0) && baseCuisines.length > 0) {
                    setStaticCuisines(baseCuisines);
                    await StorageService.setItem('cuisines', baseCuisines.map(c => ({ id: c.id, name: c.name, restaurants: c.restaurants })));
                }
            } catch (e) {
                console.debug('Failed to persist session lists', e);
            }
        })();
    }, [sessionLoaded, vendorTypesFromProducts, cuisinesFromProducts, cuisinesForSelectedVendor]);

    // Use the static lists if available, otherwise fall back to computed lists
    const vendorTypes = Array.isArray(staticVendorTypes) && staticVendorTypes.length ? staticVendorTypes : (Array.isArray(vendorTypesFromProducts) ? vendorTypesFromProducts : []);
    // When a vendorType is selected, show cuisines filtered to that vendor; else show all cuisines
    const cuisines = (selectedVendorType ? cuisinesForSelectedVendor : (Array.isArray(staticCuisines) && staticCuisines.length ? staticCuisines : (Array.isArray(cuisinesFromProducts) ? cuisinesFromProducts : [])));

    // Debug values (now safe because cuisines is defined)
    const debugVendorTypes = Array.isArray(vendorTypes) ? vendorTypes.map(v => v?.name || '').filter(Boolean).slice(0, 5).join(', ') : '';
    const debugCuisines = Array.isArray(cuisines) ? cuisines.map(c => c?.name || '').filter(Boolean).slice(0, 5).join(', ') : '';

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

    // Debounced search -> trigger context fetch (ONLY on search query change)
    // Category/Cuisine filtering is done client-side for instant response
    // Old search effect removed in favor of handleSearch logic


    // Keep displayedProducts in sync with sourceProducts and current filters (normalized comparisons)
    useEffect(() => {
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];
        // REMOVED early return: if (arr.length === 0) return; 
        // We MUST update displayedProducts even if arr is empty (to clear the list)

        // If no filters selected, show all
        if (!selectedVendorType && !selectedCuisine) {
            setDisplayedProducts(arr);
            return;
        }
        const filtered = arr.filter((p) => {
            const vtRaw = p._raw?.vendor?.vendorType ?? p.vendor?.vendorType ?? null;
            const vt = vtRaw != null ? String(vtRaw).trim() : null;
            const catRaw = p._raw?.category ?? p.category ?? (Array.isArray(p.tags) ? p.tags[0] : null);
            const cat = catRaw != null ? String(catRaw).trim() : null;
            return (!selectedVendorType || vt === selectedVendorType) && (!selectedCuisine || cat === selectedCuisine);
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

    const handleVendorTypePress = React.useCallback((vendor) => {
        const vendorId = vendor.id || vendor.name;
        const newSel = selectedVendorType === vendorId ? null : vendorId;
        setSelectedVendorType(newSel);
        // If unselecting vendor, also unselect cuisine
        if (newSel === null) setSelectedCuisine(null);

        persistSelection('selectedVendorType', newSel);
        if (newSel === null) persistSelection('selectedCuisine', null);
        // Removed manual fetchProducts - useEffect will handle it based on state change
    }, [selectedVendorType]);

    const handleCuisinePress = React.useCallback((cuisine) => {
        const cuisineId = cuisine.id || cuisine.name;
        const newSel = selectedCuisine === cuisineId ? null : cuisineId;
        setSelectedCuisine(newSel);
        persistSelection('selectedCuisine', newSel);
        // Removed manual fetchProducts - useEffect will handle it
    }, [selectedCuisine]);

    const handleRestaurantPress = (restaurant) => {
        console.log('Restaurant pressed:', restaurant.name);
        navigation.navigate('RestaurantDetails', { restaurant });
    };

    // Search Handler: Navigate to dedicated Search Screen
    const handleSearchPress = () => {
        navigation.navigate('Search');
    };


    useEffect(() => {
        // Fetch location on mount if not already set
        if (!currentLocation && !locationLoading) {
            getCurrentLocation();
        }
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
        // Navigate to parent stack to access LocationAddress screen if needed, or direct
        // Since it's a stack, simple navigate usually works if screen is registered
        navigation.navigate('LocationAddress');
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

    const prevNonEmptyRef = useRef([]);
    useEffect(() => {
        if (Array.isArray(displayedProducts) && displayedProducts.length > 0) {
            prevNonEmptyRef.current = displayedProducts;
        }
    }, [displayedProducts]);

    return (
        <SafeAreaView style={styles(colors).safeArea} edges={['top']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.primary}
            />
            {/* Sticky Search Header - appears on scroll */}
            <StickySearchHeader
                scrollY={scrollY}
                onCartPress={handleCartPress}
                onLocationPress={handleLocationPress}
                area={address}
                cartItemCount={cartItemCount}
                cartVendorsCount={cartVendorsCount}
                onSearchPress={handleSearchPress} // REPLACED: trigger nav only
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
                    location={currentLocation}
                    area={address}
                    loading={locationLoading}
                    errorMsg={locationError}
                    onCartPress={handleCartPress}
                    onLocationPress={handleLocationPress}
                    cartItemCount={cartItemCount}
                    cartVendorsCount={cartVendorsCount}
                    onSearchPress={handleSearchPress} // REPLACED: trigger nav only
                    activeOffer={activeOffer}
                    featuredShops={featuredShops}
                    onOfferPress={handleOfferPress}
                    onShopPress={handleShopPress}
                    userName={userName}
                />

                {/* Categories Section */}
                <SectionHeader title={t('whatDoYouNeed')} showSeeAll={false} />
                <VendorType categories={Array.isArray(vendorTypes) ? vendorTypes : []} onPress={handleVendorTypePress} selectedId={selectedVendorType} />

                {/* Categories Section - Dynamic from API based on vendor type */}
                <SectionHeader
                    title={selectedVendorType ? t('categories') : t('browseByCategory')}
                    showSeeAll={false}
                />
                <Category cuisines={Array.isArray(cuisines) ? cuisines : []} selectedCuisine={selectedCuisine} onPress={handleCuisinePress} />

                {/* Results Section */}
                <SectionHeader
                    title={searchQuery ? `Search Results (${(products || []).length})` : t('nearYou')}
                    onSeeAll={!searchQuery ? () => navigation.navigate('SeeAll', {
                        allItems: sourceProducts,  // ALL products (unfiltered)
                        vendorTypes: vendorTypes,  // For filter chips
                        availableCuisines: cuisinesFromProducts,  // All cuisines
                        title: t('nearYou')
                    }) : undefined}
                />
                {productsLoading && (!displayedProducts || displayedProducts.length === 0) ? (
                    <SkeletonCategory />
                ) : (displayedByVendor.length > 0) ? (
                    <RestaurantsList restaurants={displayedByVendor} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />
                ) : (prevNonEmptyRef.current.length > 0 && (selectedVendorType || selectedCuisine)) ? (
                    <RestaurantsList restaurants={prevNonEmptyRef.current} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />
                ) : (
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
