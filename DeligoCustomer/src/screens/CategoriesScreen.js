import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Text, TouchableOpacity, RefreshControl, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { spacing } from '../theme';

import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import {
    LocationHeader,
    SectionHeader,
    StickySearchHeader,
    SkeletonCategory,
} from '../components';
import GlovoBubbles from '../components/GlovoBubbles';
import Category from '../components/Categories/CuisinesList';
import { useProducts } from '../contexts/ProductsContext';
import StorageService from '../utils/storage';

import OfferModal from '../components/Categories/OfferModal';
import RestaurantsList from '../components/Categories/RestaurantsList';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import { useProfile } from '../contexts/ProfileContext';
import formatCurrency from '../utils/currency';

const CategoriesScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    // Use global LocationContext instead of local hook
    const {
        currentLocation,
        address,
        loading: locationLoading,
        getCurrentLocation
    } = useLocation();

    // Business category (API) selection
    // selectedVendorType remains the selected business category slug (e.g. "restaurant") for backwards UI compatibility
    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState(null);

    const [selectedVendorType, setSelectedVendorType] = useState(null);
    const [selectedCuisine, setSelectedCuisine] = useState(null);
    const [searchQuery] = useState('');
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
        // Check includes with lowercased selected type (e.g. 'restaurant')
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
    const [selectedOffer] = useState(null);

    // Cart counts from context
    const { cartsArray, itemCount } = useCart();
    const cartVendorsCount = (cartsArray && cartsArray.length) ? cartsArray.length : 0; // number of vendor carts
    const cartItemCount = itemCount || 0; // Use context-provided total count

    // Use products context for live data
    const { products, fetchProducts, fetchBusinessCategories, fetchProductCategories, loading: productsLoading } = useProducts();
    const [refreshing, setRefreshing] = useState(false);

    // Dynamic Categories from API
    const [apiCategories, setApiCategories] = useState([]);
    const [apiProductCategories, setApiProductCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            // Avoid double loading state if already loading products, but ensure we catch category fetch time
            setCategoriesLoading(true);
            try {
                if (fetchBusinessCategories) {
                    console.log('[CategoriesScreen] Fetching business categories...');
                    const cats = await fetchBusinessCategories();
                    console.log('[CategoriesScreen] Fetched categories:', cats?.length);
                    if (mounted && cats && cats.length > 0) {
                        setApiCategories(cats);
                    }
                }
                if (fetchProductCategories) {
                    console.log('[CategoriesScreen] Fetching product categories...');
                    const pcats = await fetchProductCategories();
                    console.log('[CategoriesScreen] Fetched product categories:', pcats?.length);
                    if (mounted && pcats && pcats.length > 0) {
                        setApiProductCategories(pcats);
                    }
                }
            } catch (error) {
                console.error('[CategoriesScreen] Error fetching categories:', error);
            } finally {
                if (mounted) setCategoriesLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [fetchBusinessCategories, fetchProductCategories]);

    // Use API categories if available, else fallback logic (but user wants ONLY API)
    // We will override vendorTypesFromProducts if apiCategories exists
    // MOVED definition down below vendorTypesFromProducts to avoid ReferenceError/undefined

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
    const [, setCacheTtlMs] = useState(5 * 60 * 1000);

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

    // Derive cuisines from products, optionally filtered by selectedVendorType
    // NOTE: selectedVendorType is stored as business category slug (e.g. "restaurant").
    // We'll match it against vendorType using lowercase includes.
    const cuisinesForSelectedVendor = React.useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];

        const selected = selectedVendorType ? String(selectedVendorType).toLowerCase().trim() : null;

        for (const p of arr) {
            const vtRaw = p.vendor?.vendorType || p._raw?.vendor?.vendorType || '';
            const vt = vtRaw ? String(vtRaw).toLowerCase().trim() : '';

            if (selected && (!vt || !vt.includes(selected))) continue;

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
                const storedSelBusinessId = await StorageService.getItem('selectedBusinessCategoryId');
                if (!mounted) return;

                const normalizeList = (input) => {
                    if (!input) return [];
                    if (Array.isArray(input)) {
                        if (input.every(i => typeof i === 'string')) return input.map(s => ({ id: s, name: s }));
                        return input.map(i => (typeof i === 'string' ? { id: i, name: i } : { id: i.id || i.name || String(i), name: i.name || i.id || String(i) }));
                    }
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
                if (storedSelBusinessId) setSelectedBusinessCategoryId(storedSelBusinessId);
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

    // Persist user selections in session storage
    const persistSelection = async (key, value) => {
        try {
            await StorageService.setItem(key, value === null ? null : value);
        } catch (e) {
            console.debug('Failed to persist selection', key, e);
        }
    };

    // Keep displayedProducts in sync with sourceProducts and current filters (normalized comparisons)
    useEffect(() => {
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];

        // If no filters selected, show all
        if (!selectedVendorType && !selectedCuisine) {
            setDisplayedProducts(arr);
            return;
        }

        let logCount = 0;
        const filtered = arr.filter((p) => {
            const vtRaw = p._raw?.vendor?.vendorType ?? p.vendor?.vendorType ?? null;
            const vt = vtRaw != null ? String(vtRaw).trim().toLowerCase() : null;

            const matchVendor = !selectedVendorType || (vt && vt.includes(selectedVendorType));

            if (selectedVendorType && !matchVendor && logCount < 3) {
                console.log(`[FilterDebug] Fail Vendor Match. Prod: ${p.name}, VT: '${vt}', Selected: '${selectedVendorType}'`);
                logCount++;
            }

            // Product Category handling
            const pCats = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);
            const rawTags = Array.isArray(p._raw?.tags) ? p._raw.tags : [];
            const allCats = [...new Set([...pCats, ...rawTags])];

            const targetCuisine = selectedCuisine ? String(selectedCuisine).toLowerCase().trim() : null;

            const matchCuisine = !targetCuisine || allCats.some(c => {
                if (!c) return false;
                if (typeof c === 'string') {
                    const s = c.toLowerCase().trim();
                    return s === targetCuisine || s.includes(targetCuisine);
                }
                if (typeof c === 'object') {
                    const name = c.name ? c.name.toLowerCase().trim() : '';
                    const slug = c.slug ? c.slug.toLowerCase().trim() : '';
                    const id = (c._id || c.id) ? String(c._id || c.id).toLowerCase().trim() : '';

                    return name === targetCuisine || name.includes(targetCuisine) ||
                        slug === targetCuisine || slug.includes(targetCuisine) ||
                        id === targetCuisine;
                }
                return false;
            });

            return matchVendor && matchCuisine;
        });

        setDisplayedProducts(filtered);
    }, [sourceProducts, selectedVendorType, selectedCuisine]);

    // Small helper: convert a product into a vendor-shaped object for RestaurantCard.
    const toVendorCard = React.useCallback((p) => {
        if (!p) return null;
        const raw = p._raw || p;
        const vendorIdObj = (raw.vendorId && typeof raw.vendorId === 'object') ? raw.vendorId : null;

        // vendor info can be in multiple places depending on API response / normalization
        const vendorMerged = {
            ...(raw.vendor || {}),
            ...(vendorIdObj || {}),
            ...(p.vendor || {}),
        };

        const businessDetails = vendorMerged.businessDetails || {};
        const businessLocation = vendorMerged.businessLocation || {};
        const documents = vendorMerged.documents || {};

        const vendorId = vendorMerged._id || vendorMerged.id || vendorMerged.vendorId || raw.vendorId || p.vendor?.id || null;
        if (!vendorId) return null;

        const vendorName =
            vendorMerged.vendorName ||
            businessDetails.businessName ||
            vendorMerged.businessName ||
            'Unknown';

        const storePhoto = documents.storePhoto || vendorMerged.storePhoto || vendorMerged.logo || null;

        return {
            id: String(vendorId),
            // RestaurantCard prefers `restaurant.vendor` + also falls back to restaurant._raw.vendorId
            vendor: {
                id: String(vendorId),
                vendorName,
                storePhoto,
                rating: vendorMerged.rating,
                vendorType: vendorMerged.businessType || businessDetails.businessType || vendorMerged.vendorType,
                latitude: vendorMerged.latitude ?? businessLocation.latitude,
                longitude: vendorMerged.longitude ?? businessLocation.longitude,
                city: vendorMerged.city,
                address: vendorMerged.address,
                businessDetails,
                businessLocation,
                documents,
            },
            // Keep minimal raw structure for RestaurantCard fallbacks
            _raw: {
                vendor: vendorMerged,
                vendorId: vendorIdObj || vendorMerged,
                tags: raw.tags || p.tags || [],
                images: raw.images || p.images || [],
                rating: raw.rating || p.rating,
            },
            name: vendorName,
        };
    }, []);

    // --- NEW: produce a deduplicated + sorted list by vendorId (not vendorName) ---
    // This ensures the restaurants list shows one entry per vendor and displays vendor info.
    const displayedByVendor = React.useMemo(() => {
        try {
            const arr = Array.isArray(displayedProducts) ? displayedProducts : [];
            const map = new Map();
            for (const p of arr) {
                const card = toVendorCard(p);
                if (!card) continue;
                if (!map.has(card.id)) map.set(card.id, card);
            }

            const list = Array.from(map.values());

            // Helper: Haversine Distance Calculation
            const getDistance = (lat1, lon1, lat2, lon2) => {
                if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
                const R = 6371;
                const dLat = (lat2 - lat1) * (Math.PI / 180);
                const dLon = (lon2 - lon1) * (Math.PI / 180);
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const userLat = currentLocation?.latitude;
            const userLng = currentLocation?.longitude;

            list.sort((a, b) => {
                const latA = a.vendor?.latitude;
                const lngA = a.vendor?.longitude;
                const latB = b.vendor?.latitude;
                const lngB = b.vendor?.longitude;

                const distA = getDistance(userLat, userLng, latA, lngA);
                const distB = getDistance(userLat, userLng, latB, lngB);
                if (distA !== distB) return distA - distB;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });

            return list;
        } catch (e) {
            console.warn('[CategoriesScreen] Vendor list build error:', e);
            return [];
        }
    }, [displayedProducts, currentLocation, toVendorCard]);

    // --- API Product Categories filtered by selected Business Category ---
    const productCategoriesForBusiness = React.useMemo(() => {
        const arr = Array.isArray(apiProductCategories) ? apiProductCategories : [];
        if (!selectedBusinessCategoryId) return [];
        return arr.filter((c) => {
            const bid = c?.businessCategoryId;
            return bid && String(bid) === String(selectedBusinessCategoryId);
        });
    }, [apiProductCategories, selectedBusinessCategoryId]);

    // --- Vendors list should be derived from products under selected business + selected product category ---
    // We intentionally dedupe by vendorId (not vendorName) to avoid merging different vendors with same name.
    const filteredVendors = React.useMemo(() => {
        const arr = Array.isArray(sourceProducts) ? sourceProducts : [];

        // If user hasn't chosen business + product category yet, keep existing behaviour
        if (!selectedBusinessCategoryId && !selectedCuisine) {
            return displayedByVendor;
        }

        const businessSlug = selectedVendorType ? String(selectedVendorType).toLowerCase().trim() : null;
        const cuisineSlug = selectedCuisine ? String(selectedCuisine).toLowerCase().trim() : null;

        const vendorMap = new Map();
        for (const p of arr) {
            const vtRaw = p._raw?.vendor?.vendorType ?? p.vendor?.vendorType ?? '';
            const vt = vtRaw ? String(vtRaw).toLowerCase().trim() : '';
            if (businessSlug && (!vt || !vt.includes(businessSlug))) continue;

            if (cuisineSlug) {
                const pCats = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);
                const rawTags = Array.isArray(p._raw?.tags) ? p._raw.tags : [];
                const allCats = [...new Set([...pCats, ...rawTags])];

                const matchesCuisine = allCats.some(c => {
                    if (!c) return false;
                    if (typeof c === 'string') {
                        const s = c.toLowerCase().trim();
                        return s === cuisineSlug || s.includes(cuisineSlug);
                    }
                    if (typeof c === 'object') {
                        const name = c.name ? c.name.toLowerCase().trim() : '';
                        const slug = c.slug ? c.slug.toLowerCase().trim() : '';
                        const id = (c._id || c.id) ? String(c._id || c.id).toLowerCase().trim() : '';
                        return name === cuisineSlug || name.includes(cuisineSlug) ||
                            slug === cuisineSlug || slug.includes(cuisineSlug) ||
                            id === cuisineSlug;
                    }
                    return false;
                });
                if (!matchesCuisine) continue;
            }

            const card = toVendorCard(p);
            if (!card) continue;
            if (!vendorMap.has(card.id)) vendorMap.set(card.id, card);
        }

        return Array.from(vendorMap.values());
    }, [sourceProducts, selectedBusinessCategoryId, selectedVendorType, selectedCuisine, displayedByVendor, toVendorCard]);

    // Use API categories if available, else fallback logic
    // Defined here to ensure vendorTypesFromProducts is available
    const displayCategories = apiCategories.length > 0 ? apiCategories : vendorTypesFromProducts;

    console.log('[CategoriesScreen] Render. Selected:', selectedVendorType, 'SelectedBusinessId:', selectedBusinessCategoryId, 'ApiCats:', apiCategories.length, 'DisplayCats:', displayCategories.length);

    const handleVendorTypePress = React.useCallback((vendor) => {
        // Business category from API includes both slug and id.
        const rawSlug = vendor?.slug || vendor?.name;
        const vendorSlug = rawSlug ? String(rawSlug).toLowerCase().trim() : null;

        const vendorId = vendor?._id || vendor?.id || null;

        const isSame = (selectedVendorType && selectedVendorType.toLowerCase()) === vendorSlug;
        const newSel = isSame ? null : vendorSlug;

        setSelectedVendorType(newSel);
        setSelectedBusinessCategoryId(isSame ? null : vendorId);

        // Changing business category resets product category
        if (!newSel) setSelectedCuisine(null);
        if (newSel) setSelectedCuisine(null);

        persistSelection('selectedVendorType', newSel);
        persistSelection('selectedBusinessCategoryId', isSame ? null : vendorId);
        persistSelection('selectedCuisine', null);
    }, [selectedVendorType]);

    const handleCuisinePress = React.useCallback((cuisine) => {
        // For API product categories, slug is stable. Fallback to name.
        const val = cuisine?.slug || cuisine?.name;
        const newVal = (selectedCuisine && val && String(selectedCuisine).toLowerCase().trim() === String(val).toLowerCase().trim()) ? null : val;

        setSelectedCuisine(newVal);
        persistSelection('selectedCuisine', newVal);
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
            await fetchProducts({
                page: 1,
                vendorType: selectedVendorType || undefined,
                category: selectedCuisine || undefined,
                force: true
            });
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

    const prevNonEmptyRef = useRef([]);
    useEffect(() => {
        // Cache last non-empty VENDOR LIST (not product list) to prevent jumping UI
        if (Array.isArray(displayedByVendor) && displayedByVendor.length > 0) {
            prevNonEmptyRef.current = displayedByVendor;
        }
    }, [displayedByVendor]);

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

            {(productsLoading || categoriesLoading) && !refreshing ? (
                <SkeletonCategory />
            ) : (
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
                        categories={displayCategories}
                        onPress={handleVendorTypePress}
                        selectedId={selectedVendorType}
                    />

                    {/* Categories Section - filtered by selected Business Category */}
                    <SectionHeader
                        title={selectedVendorType ? t('categories') : t('browseByCategory')}
                        showSeeAll={false}
                    />

                    {selectedBusinessCategoryId && productCategoriesForBusiness.length === 0 ? (
                        <View style={styles(colors).noResultsContainer}>
                            <Text style={styles(colors).noResultsText}>{t('noProductCategoriesAdded') || 'No product categories has added'}</Text>
                        </View>
                    ) : (
                        <Category
                            cuisines={selectedBusinessCategoryId ? productCategoriesForBusiness : (apiProductCategories.length > 0 ? apiProductCategories : dynamicCategories)}
                            selectedCuisine={selectedCuisine}
                            onPress={handleCuisinePress}
                        />
                    )}

                    {/* Results Section */}
                    <SectionHeader
                        title={searchQuery ? `${t('searchResults')} (${(products || []).length})` : t('nearYou')}
                        onSeeAll={!searchQuery ? () => navigation.navigate('SeeAll', {
                            allItems: sourceProducts,
                            vendorTypes: vendorTypes,
                            availableCuisines: cuisinesFromProducts,
                            title: t('nearYou')
                        }) : undefined}
                    />

                    {productsLoading && (!displayedProducts || displayedProducts.length === 0) ? (
                        <SkeletonCategory />
                    ) : (selectedBusinessCategoryId && selectedCuisine && filteredVendors.length === 0) ? (
                        <View style={styles(colors).noResultsContainer}>
                            <Text style={styles(colors).noResultsText}>{t('noVendorsFound') || 'No vendor is for that business categories'}</Text>
                        </View>
                    ) : (filteredVendors.length > 0) ? (
                        <RestaurantsList restaurants={filteredVendors} onPress={handleRestaurantPress} searchQuery={searchQuery} disableScroll={true} />
                    ) : (displayedByVendor.length > 0) ? (
                        // Default: always show vendors (deduped) when no strict filter has produced a vendor list
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
                                        setSelectedBusinessCategoryId(null);
                                        setSelectedCuisine(null);
                                        persistSelection('selectedVendorType', null);
                                        persistSelection('selectedBusinessCategoryId', null);
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
            )}

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
