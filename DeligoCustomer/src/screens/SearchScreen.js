import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProducts } from '../contexts/ProductsContext';
import StorageService from '../utils/storage';
import RestaurantsList from '../components/Categories/RestaurantsList';
import ProductSearchResultCard from '../components/ProductSearchResultCard';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';

const SearchScreen = ({ navigation }) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { products, loading: productsLoading, fetchProducts } = useProducts();
    const [searchQuery, setSearchQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedVendorType, setSelectedVendorType] = useState('all'); // 'all', 'Resturent', 'Store', etc.
    const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'distance', 'rating'
    const inputRef = useRef(null);

    // Initial Load: Focus input & load history
    useEffect(() => {
        const loadRecents = async () => {
            const recents = await StorageService.getItem('recentSearches');
            if (recents && Array.isArray(recents)) setRecentSearches(recents);
        };
        loadRecents();

        // Auto-focus after small delay
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Save recent search interaction
    const saveRecentSearch = async (query) => {
        if (!query || !query.trim()) return;
        const newEntry = query.trim();
        const updated = [newEntry, ...recentSearches.filter(s => s !== newEntry)].slice(0, 10); // Keep top 10
        setRecentSearches(updated);
        await StorageService.setItem('recentSearches', updated);
    };

    // Debounce Search
    useEffect(() => {
        setIsTyping(true);
        const tId = setTimeout(async () => {
            if (searchQuery.trim()) {
                // Fetch Products (via Context)
                // The API doesn't have a working restaurant endpoint, so we derive restaurants from product data
                await fetchProducts({ search: searchQuery, page: 1, force: false });
                setIsTyping(false);
            } else {
                setIsTyping(false);
            }
        }, 500);
        return () => clearTimeout(tId);
    }, [searchQuery]);

    // Client-side filtering with fuzzy matching
    const filterBySearchQuery = (items, query) => {
        if (!query || !query.trim()) return items;
        const q = query.toLowerCase().trim();

        return items.filter(item => {
            // Match in product name
            const name = (item.name || '').toLowerCase();
            // Match in vendor name
            const vendorName = (item._raw?.vendor?.vendorName || item.vendor?.vendorName || '').toLowerCase();
            // Match in tags/category
            const tags = (item.categories || []).join(' ').toLowerCase();
            const category = (item._raw?.category || item.category || '').toLowerCase();

            return name.includes(q) || vendorName.includes(q) || tags.includes(q) || category.includes(q);
        });
    };

    // Filter by vendor type
    const filterByVendorType = (items, vendorType) => {
        if (vendorType === 'all') return items;
        return items.filter(item => {
            const itemVendorType = item._raw?.vendor?.vendorType || item.vendor?.vendorType || '';
            return itemVendorType === vendorType;
        });
    };

    // Sort products
    const sortProducts = (items, sortMethod) => {
        const sorted = [...items];
        switch (sortMethod) {
            case 'distance':
                return sorted.sort((a, b) => {
                    const distA = parseFloat(a.distance) || 999;
                    const distB = parseFloat(b.distance) || 999;
                    return distA - distB;
                });
            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'price_low':
                return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            case 'price_high':
                return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
            case 'relevance':
            default:
                return sorted; // Keep API order
        }
    };

    // Derived: Search Results (Products) with filtering
    const productResults = React.useMemo(() => {
        if (!searchQuery.trim()) return [];
        let filtered = products || [];

        // Apply search query filter
        filtered = filterBySearchQuery(filtered, searchQuery);

        // Apply vendor type filter
        filtered = filterByVendorType(filtered, selectedVendorType);

        // Apply sorting
        filtered = sortProducts(filtered, sortBy);

        return filtered;
    }, [products, searchQuery, selectedVendorType, sortBy]);

    // Derive unique restaurants from product results
    // Since the API doesn't have a working restaurant endpoint, we extract vendors from products
    const matchedRestaurants = React.useMemo(() => {
        if (!productResults || productResults.length === 0) return [];

        const vendorMap = new Map();
        productResults.forEach((product) => {
            const vendor = product._raw?.vendor || product.vendor;
            if (!vendor || !vendor.vendorId) return;

            // Use vendor ID as key to avoid duplicates
            if (!vendorMap.has(vendor.vendorId)) {
                vendorMap.set(vendor.vendorId, {
                    id: vendor.vendorId,
                    _id: vendor.vendorId,
                    vendorName: vendor.vendorName || vendor.name || 'Unknown',
                    name: vendor.vendorName || vendor.name || 'Unknown',
                    image: vendor.storePhoto || vendor.logo,
                    rating: vendor.rating || 0,
                    deliveryTime: vendor.deliveryTime || '',
                    deliveryFee: vendor.deliveryFee || '',
                    distance: vendor.distance || '',
                    vendorType: vendor.vendorType || '',
                    // Include full vendor object for navigation
                    _raw: { vendor }
                });
            }
        });

        return Array.from(vendorMap.values());
    }, [productResults]);

    const matchedDishes = productResults;

    const handleRecentClick = (term) => {
        setSearchQuery(term);
        saveRecentSearch(term);
    };

    const handleClearHistory = async () => {
        setRecentSearches([]);
        await StorageService.setItem('recentSearches', []);
    };

    const handleResultPress = (item) => {
        // Save history on click
        saveRecentSearch(searchQuery);
        // Navigate
        navigation.navigate('RestaurantDetails', { restaurant: item });
    };

    // Render Logic Helper
    const renderContent = () => {
        if (searchQuery.trim().length === 0) {
            // SHOW RECENT SEARCHES
            return (
                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    {recentSearches.length > 0 && (
                        <View style={styles(colors, isDarkMode).section}>
                            <View style={styles(colors, isDarkMode).sectionHeader}>
                                <Text style={styles(colors, isDarkMode).sectionTitle}>{t('recentSearches') || 'Recent Searches'}</Text>
                                <TouchableOpacity onPress={handleClearHistory}>
                                    <Text style={styles(colors, isDarkMode).clearText}>{t('clearAll') || 'Clear all'}</Text>
                                </TouchableOpacity>
                            </View>
                            {recentSearches.map((term, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles(colors, isDarkMode).recentItem}
                                    onPress={() => handleRecentClick(term)}
                                >
                                    <Ionicons name="time-outline" size={20} color={colors.text.secondary} style={{ marginRight: 12 }} />
                                    <Text style={styles(colors, isDarkMode).recentText}>{term}</Text>
                                    <Ionicons name="arrow-forward-outline" size={16} color={colors.text.tertiary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            );
        }

        // SEARCHING... (Show loader while typing or loading)
        if (isTyping || productsLoading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }

        // NO RESULTS
        if (!productsLoading && matchedRestaurants.length === 0 && matchedDishes.length === 0) {
            return (
                <View style={styles(colors, isDarkMode).emptyState}>
                    <Ionicons name="search-outline" size={64} color={colors.text.tertiary} style={{ marginBottom: 16 }} />
                    <Text style={styles(colors, isDarkMode).emptyTitle}>
                        {t('noResultsFor') || 'No results for'} "{searchQuery}"
                    </Text>
                    <Text style={styles(colors, isDarkMode).emptySub}>
                        {t('tryTheseTips') || 'Try these tips:'}
                    </Text>

                    <View style={styles(colors, isDarkMode).suggestionsList}>
                        <View style={styles(colors, isDarkMode).suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles(colors, isDarkMode).suggestionText}>
                                {t('checkSpelling') || 'Check your spelling'}
                            </Text>
                        </View>
                        <View style={styles(colors, isDarkMode).suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles(colors, isDarkMode).suggestionText}>
                                {t('tryDifferentKeywords') || 'Try different keywords'}
                            </Text>
                        </View>
                        <View style={styles(colors, isDarkMode).suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles(colors, isDarkMode).suggestionText}>
                                {t('removeFilters') || 'Remove filters to see more results'}
                            </Text>
                        </View>
                    </View>

                    {selectedVendorType !== 'all' && (
                        <TouchableOpacity
                            style={[styles(colors, isDarkMode).clearFiltersButton, { backgroundColor: colors.primary }]}
                            onPress={() => setSelectedVendorType('all')}
                        >
                            <Text style={styles(colors, isDarkMode).clearFiltersText}>
                                {t('clearFilters') || 'Clear Filters'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        // RESULTS
        return (
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* SECTION 1: RESTAURANTS */}
                {matchedRestaurants.length > 0 && (
                    <View style={styles(colors, isDarkMode).section}>
                        <Text style={[styles(colors, isDarkMode).sectionTitle, { marginBottom: 12 }]}>
                            {t('places') || 'Restaurants'}
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 4 }}
                        >
                            {matchedRestaurants.map((restaurant) => (
                                <View key={restaurant.id || restaurant._id || Math.random()} style={{ width: 280, marginRight: 12 }}>
                                    <RestaurantsList
                                        restaurants={[restaurant]}
                                        disableScroll={true}
                                        onPress={(item) => navigation.navigate('RestaurantDetails', { restaurant: item })}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* SECTION 2: DISHES */}
                {matchedDishes.length > 0 && (
                    <View style={styles(colors, isDarkMode).section}>
                        <Text style={[styles(colors, isDarkMode).sectionTitle, { marginBottom: 12, marginTop: 8 }]}>
                            {t('dishes') || 'Dishes'} ({matchedDishes.length})
                        </Text>
                        {matchedDishes.map((item) => (
                            <ProductSearchResultCard
                                key={item.id || item._id || Math.random()}
                                product={item}
                                onPress={handleResultPress}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles(colors, isDarkMode).safeArea}>
            {/* Header: Back + Search Input + Clear */}
            <View style={styles(colors, isDarkMode).header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles(colors, isDarkMode).backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>

                <View style={styles(colors, isDarkMode).inputContainer}>
                    <Ionicons name="search" size={20} color={colors.text.secondary} style={{ marginRight: 8 }} />
                    <TextInput
                        ref={inputRef}
                        style={styles(colors, isDarkMode).input}
                        placeholder={t('searchRestaurants') || 'Search for restaurants...'}
                        placeholderTextColor={colors.text.secondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {isTyping ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : searchQuery.length > 0 ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Filter Chips & Sort - Only show when searching */}
            {searchQuery.trim().length > 0 && (
                <View style={styles(colors, isDarkMode).filtersContainer}>
                    {/* Vendor Type Filter Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles(colors, isDarkMode).chipsScroll}
                        contentContainerStyle={{ paddingHorizontal: spacing.md }}
                    >
                        <TouchableOpacity
                            style={[
                                styles(colors, isDarkMode).filterChip,
                                selectedVendorType === 'all' && styles(colors, isDarkMode).filterChipActive
                            ]}
                            onPress={() => setSelectedVendorType('all')}
                        >
                            <Text style={[
                                styles(colors, isDarkMode).filterChipText,
                                selectedVendorType === 'all' && styles(colors, isDarkMode).filterChipTextActive
                            ]}>
                                🏪 {t('all') || 'All'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles(colors, isDarkMode).filterChip,
                                selectedVendorType === 'Resturent' && styles(colors, isDarkMode).filterChipActive
                            ]}
                            onPress={() => setSelectedVendorType('Resturent')}
                        >
                            <Text style={[
                                styles(colors, isDarkMode).filterChipText,
                                selectedVendorType === 'Resturent' && styles(colors, isDarkMode).filterChipTextActive
                            ]}>
                                🍕 {t('food') || 'Food'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles(colors, isDarkMode).filterChip,
                                selectedVendorType === 'Store' && styles(colors, isDarkMode).filterChipActive
                            ]}
                            onPress={() => setSelectedVendorType('Store')}
                        >
                            <Text style={[
                                styles(colors, isDarkMode).filterChipText,
                                selectedVendorType === 'Store' && styles(colors, isDarkMode).filterChipTextActive
                            ]}>
                                🛒 {t('groceries') || 'Groceries'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles(colors, isDarkMode).filterChip,
                                selectedVendorType === 'Pharmacy' && styles(colors, isDarkMode).filterChipActive
                            ]}
                            onPress={() => setSelectedVendorType('Pharmacy')}
                        >
                            <Text style={[
                                styles(colors, isDarkMode).filterChipText,
                                selectedVendorType === 'Pharmacy' && styles(colors, isDarkMode).filterChipTextActive
                            ]}>
                                💊 {t('pharmacy') || 'Pharmacy'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Sort Dropdown */}
                    <View style={styles(colors, isDarkMode).sortContainer}>
                        <TouchableOpacity
                            style={styles(colors, isDarkMode).sortButton}
                            onPress={() => {
                                // Cycle through sort options
                                const sortOptions = ['relevance', 'distance', 'rating', 'price_low'];
                                const currentIndex = sortOptions.indexOf(sortBy);
                                const nextIndex = (currentIndex + 1) % sortOptions.length;
                                setSortBy(sortOptions[nextIndex]);
                            }}
                        >
                            <Ionicons name="funnel-outline" size={16} color={colors.text.secondary} />
                            <Text style={styles(colors, isDarkMode).sortText}>
                                {sortBy === 'distance' && (t('distance') || 'Distance')}
                                {sortBy === 'rating' && (t('rating') || 'Rating')}
                                {sortBy === 'price_low' && (t('price') || 'Price')}
                                {sortBy === 'relevance' && (t('relevance') || 'Relevance')}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Content Body */}
            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#eee',
        backgroundColor: colors.surface,
    },
    backButton: {
        padding: 4,
        marginRight: spacing.sm,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
        borderRadius: 24, // Rounder pill shape
        paddingHorizontal: 12,
        height: 44,
    },
    input: {
        flex: 1,
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        color: colors.text.primary,
        marginLeft: 4,
        paddingVertical: 0, // Fix alignment on Android
    },
    section: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-SemiBold',
        color: colors.text.primary,
    },
    clearText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
        color: colors.primary,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#f0f0f0',
    },
    recentText: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-SemiBold',
        color: colors.text.primary,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
    },
    // Filter & Sort Styles
    filtersContainer: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#eee',
    },
    chipsScroll: {
        flexGrow: 0,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
        color: colors.text.secondary,
    },
    filterChipTextActive: {
        color: colors.primary,
        fontFamily: 'Poppins-SemiBold',
    },
    sortContainer: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
        alignSelf: 'flex-start',
    },
    sortText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
        color: colors.text.secondary,
        marginLeft: 6,
        marginRight: 4,
    },
    // Enhanced Empty State Styles
    suggestionsList: {
        marginTop: 20,
        alignSelf: 'stretch',
        paddingHorizontal: spacing.lg,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    suggestionText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        marginLeft: 8,
        flex: 1,
    },
    clearFiltersButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    clearFiltersText: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-SemiBold',
        color: '#fff',
    },
});

export default SearchScreen;
