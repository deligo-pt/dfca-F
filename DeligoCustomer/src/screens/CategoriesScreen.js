import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text, TouchableOpacity, RefreshControl, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { spacing } from '../theme';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import {
    LocationHeader,
    SectionHeader,
    StickySearchHeader,
    SkeletonCategory,
} from '../components';
import GlovoBubbles from '../components/GlovoBubbles';
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
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

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
        { id: 'pizza', name: t('pizza'), icon: '🍕' },
        { id: 'burger', name: t('burger'), icon: '🍔' },
        { id: 'chinese', name: t('chinese'), icon: '🥡' },
        { id: 'indian', name: t('indian'), icon: '🍛' },
        { id: 'healthy', name: t('healthy'), icon: '🥗' },
        { id: 'desserts', name: t('dessert'), icon: '🍰' },
        { id: 'coffee', name: t('coffee'), icon: '☕' },
    ];

    const STORE_CATEGORIES = [
        { id: 'dairy', name: t('dairy'), icon: '🥛' },
        { id: 'fruits', name: t('fruits'), icon: '🍎' },
        { id: 'snacks', name: t('snacks'), icon: '🍪' },
        { id: 'beverages', name: t('beverages'), icon: '🥤' },
        { id: 'frozen', name: t('frozen'), icon: '🧊' },
        { id: 'household', name: t('household'), icon: '🧹' },
        { id: 'pharmacy', name: t('pharmacy'), icon: '💊' },
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
    const { cartsArray, itemCount } = useCart();
    const cartVendorsCount = (cartsArray && cartsArray.length) ? cartsArray.length : 0; // number of vendor carts
    const cartItemCount = itemCount || 0; // Use context-provided total count

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
    // Updated to handle nested vendorId object
    const localNormalize = (p) => {
        const raw = p._raw || p;
        let vendorSource = raw.vendor || {};
        if (raw.vendorId && typeof raw.vendorId === 'object') {
            vendorSource = { ...vendorSource, ...raw.vendorId };
        }

        const businessDetails = vendorSource.businessDetails || {};
        const businessLocation = vendorSource.businessLocation || {};

        // Correctly access documents object which might be inside vendorSource
        const documents = vendorSource.documents || {};
        const storePhoto = documents.storePhoto || vendorSource.storePhoto || vendorSource.logo;

        const vendorName = vendorSource.businessName || businessDetails.businessName || vendorSource.vendorName || raw.name || t('unknown');
        // Check both businessType (new) and vendorType (old)
        let vendorType = vendorSource.businessType || businessDetails.businessType || vendorSource.vendorType || '';

        // Just trim and uppercase, do NOT merge different spellings as per user request
        if (vendorType) {
            vendorType = String(vendorType).toUpperCase().trim();
        }
        const vendorRating = (vendorSource.rating && typeof vendorSource.rating === 'number') ? vendorSource.rating : 0;

        const price = (p.pricing && typeof p.pricing.price !== 'undefined') ? p.pricing.price : (raw.price || 0);

        return {
            _raw: raw,
            id: p._id || p.productId || vendorSource._id || `${Math.random().toString(36).slice(2)}`,
            // Prioritize storePhoto for the main image if available
            image: storePhoto || (Array.isArray(p.images) && p.images[0]) || null,
            name: vendorName,
            categories: Array.isArray(p.tags) ? p.tags : (p.category ? [p.category] : []),
            rating: (p.rating && (typeof p.rating === 'number' ? p.rating : p.rating.average)) || vendorRating || 0,
            deliveryTime: p.deliveryTime || '',
            distance: p.distance || '',
            deliveryFee: formatCurrency(p.pricing?.currency || '', price),
            offer: (p.pricing && p.pricing.discount) ? `${p.pricing.discount}% ${t('off')}` : null,
            vendor: {
                id: vendorSource._id || vendorSource.vendorId || vendorSource.id,
                vendorName: vendorName,
                vendorType: vendorType,
                rating: vendorRating,
                latitude: vendorSource.latitude || businessLocation.latitude,
                longitude: vendorSource.longitude || businessLocation.longitude,
                storePhoto: storePhoto
            }
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
                qs.set('page', 1);
                qs.set('limit', 1000);
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
            // Use normalized vendor object from context logic
            const vt = p.vendor?.vendorType || (p._raw?.vendor?.vendorType) || '';

            if (vt && String(vt).trim()) {
                const key = String(vt).trim();
                // Avoid logging object IDs as keys
                if (key.length < 24 || !/^[0-9a-fA-F]{24}$/.test(key)) {
                    if (!map.has(key)) {
                        // Map vendor types to icons for header
                        const icon = key.toLowerCase().includes('resturent') || key.toLowerCase().includes('restaurant')
                            ? '🍕'
                            : key.toLowerCase().includes('store') || key.toLowerCase().includes('grocery')
                                ? '🛒'
                                : key.toLowerCase().includes('pharmacy')
                                    ? '💊'
                                    : '🏪';
                        map.set(key, { id: key, name: key, icon });
                    }
                }
            }
        });
        return Array.from(map.values());
    }, [sourceProducts]);

    // Derive cuisines from products, optionally filtered by selected vendorType
    const cuisinesForSelectedVendor = React.useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];
        for (const p of arr) {
            const vt = p.vendor?.vendorType || (p._raw?.vendor?.vendorType) || '';

            if (selectedVendorType && String(vt).trim() !== selectedVendorType) continue;

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
        if (sec < 60) return `${sec}${t('sAgo')}`;
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}${t('mAgo')}`;
        const hr = Math.floor(min / 60);
        return `${hr}${t('hAgo')}`;
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
            console.log(`[CategoriesScreen] Sorting ${list.length} items by distance...`);

            // Helper: Haversine Distance Calculation
            const getDistance = (lat1, lon1, lat2, lon2) => {
                if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
                const R = 6371; // Radius of the earth in km
                const dLat = (lat2 - lat1) * (Math.PI / 180);
                const dLon = (lon2 - lon1) * (Math.PI / 180);
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c; // Distance in km
            };

            const userLat = currentLocation?.latitude;
            const userLng = currentLocation?.longitude;

            list.sort((a, b) => {
                // Get vendor coords
                const latA = a._raw?.vendor?.latitude || a.vendor?.latitude;
                const lngA = a._raw?.vendor?.longitude || a.vendor?.longitude;
                const latB = b._raw?.vendor?.latitude || b.vendor?.latitude;
                const lngB = b._raw?.vendor?.longitude || b.vendor?.longitude;

                const distA = getDistance(userLat, userLng, latA, lngA);
                const distB = getDistance(userLat, userLng, latB, lngB);

                // Sort ascending (nearest first)
                if (distA !== distB) return distA - distB;

                return (String(a.name || '').localeCompare(String(b.name || '')));
            });
            console.log(`[CategoriesScreen] displayedByVendor count: ${list.length}`);
            return list;
        } catch (e) {
            console.warn('[CategoriesScreen] Sort error:', e);
            // On any unexpected shape issues, fall back to raw displayedProducts
            // Deduplicate even in fallback to avoid crash
            return Array.isArray(displayedProducts) ? displayedProducts : [];
        }
    }, [displayedProducts, currentLocation]);

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

    // State to manage sticky header interactivity (pointerEvents)
    const [isStickyVisible, setIsStickyVisible] = useState(false);

    useEffect(() => {
        const listener = scrollY.addListener(({ value }) => {
            // Threshold matches the opacity animation start (approx 80-100)
            const shouldBeVisible = value > 80;
            if (shouldBeVisible !== isStickyVisible) {
                setIsStickyVisible(shouldBeVisible);
            }
        });
        return () => scrollY.removeListener(listener);
    }, [isStickyVisible]);

    // Force Status Bar style when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('light-content');
            if (Platform.OS === 'android') {
                StatusBar.setBackgroundColor('transparent');
                StatusBar.setTranslucent(true);
            }
        }, [])
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent={true}
            />
            {/* PERMANENT FIX: Static Status Bar Background */}
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: insets.top,
                backgroundColor: colors.primary,
                zIndex: 9999,
            }} />

            {/* Sticky Search Header - appears on scroll */}
            <StickySearchHeader
                scrollY={scrollY}
                onCartPress={handleCartPress}
                onLocationPress={handleLocationPress}
                area={address}
                cartItemCount={cartItemCount}
                cartVendorsCount={cartVendorsCount}
                onSearchPress={handleSearchPress} // REPLACED: trigger nav only
                paddingTop={insets.top}
                pointerEvents={isStickyVisible ? 'auto' : 'none'}
            />



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
                        progressViewOffset={insets.top + 20}
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
                    onLocationPress={handleLocationPress}
                    onSearchPress={handleSearchPress}
                    userName={userName}
                    onProfilePress={() => navigation.navigate('Profile')}
                    onNotificationPress={() => navigation.navigate('Notifications')}
                    paddingTop={insets.top}
                />

                {/* Glovo-Style "Super App" Bubbles */}
                <GlovoBubbles
                    categories={vendorTypesFromProducts}
                    onPress={handleVendorTypePress}
                    selectedId={selectedVendorType}
                />

                {/* Categories Section - Dynamic from API based on vendor type */}
                <SectionHeader
                    title={selectedVendorType ? t('categories') : t('browseByCategory')}
                    showSeeAll={false}
                />
                <Category cuisines={Array.isArray(cuisines) ? cuisines : []} selectedCuisine={selectedCuisine} onPress={handleCuisinePress} />

                {/* Results Section */}
                <SectionHeader
                    title={searchQuery ? `${t('searchResults')} (${(products || []).length})` : t('nearYou')}
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
                                ? (t('noResultsFor') + ' ' + (selectedVendorType || selectedCuisine) || t('noMatchSelection'))
                                : (t('noResultsFor') + ' ' + (selectedVendorType || selectedCuisine) || t('noResultsFound'))
                            }
                        </Text>
                        <Text style={styles(colors).noResultsSubtext}>
                            {selectedVendorType || selectedCuisine
                                ? t('tryDifferentFilter')
                                : t('tryAdjustingFilters')
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
                                <Text style={styles(colors).clearFiltersText}>{t('clearFilters')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </Animated.ScrollView>

            <OfferModal visible={offerModalVisible} onClose={() => setOfferModalVisible(false)} offer={selectedOffer} onApply={(o) => console.log('Apply offer:', o)} />
        </View>
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
