/**
 * SeeAllScreen
 * 
 * Displays a comprehensive list of restaurants or items with filtering options
 * for vendor type, cuisine, and sorting capabilities.
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Text,
    ScrollView,
    TextInput,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLocation } from '../contexts/LocationContext';
import GlovoBubbles from '../components/GlovoBubbles';
import RestaurantCard from '../components/RestaurantCard';

const SeeAllScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currentLocation } = useLocation();

    // Route parameters
    const {
        allItems = [],
        vendorTypes = [],
        availableCuisines = [],
        title = t('nearYou')
    } = route.params || {};

    // State management
    const [selectedVendorType, setSelectedVendorType] = useState(null);
    const [selectedCuisine, setSelectedCuisine] = useState(null);
    const [sortBy, setSortBy] = useState('distance'); // Default to distance
    const [searchQuery, setSearchQuery] = useState('');

    // Memoized deduplication of items based on vendor ID or name
    const deduplicatedItems = useMemo(() => {
        const map = new Map();
        for (const p of allItems) {
            // Resolve vendor data from various structures
            const raw = p._raw || p;
            const normVendor = p.vendor || {};

            // Determine display name
            const vendorName = normVendor.vendorName ||
                normVendor.businessName ||
                (typeof raw.vendorId === 'object' ? raw.vendorId.businessDetails?.businessName : null) ||
                raw.vendor?.vendorName ||
                (p && p.name) || '';

            // Determine unique ID
            let uniqueId = normVendor.id || normVendor.vendorId;
            if (!uniqueId) {
                const rawVID = raw.vendorId || raw.vendor?.vendorId;
                if (typeof rawVID === 'object' && rawVID) uniqueId = rawVID._id || rawVID.id;
                else uniqueId = rawVID;
            }
            // Fallback key generation
            const key = uniqueId ? String(uniqueId) : String(vendorName || '').trim().toLowerCase();

            if (!map.has(key) && key) {
                map.set(key, { ...p, name: vendorName || (p && p.name) || '' });
            }
        }
        return Array.from(map.values());
    }, [allItems]);

    // Apply filters (search, vendor type, cuisine) and sort logic
    const filteredItems = useMemo(() => {
        let result = [...deduplicatedItems];

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                (item.name || '').toLowerCase().includes(q) ||
                (item.categories || []).some(c => String(c).toLowerCase().includes(q))
            );
        }

        // Vendor type filter
        if (selectedVendorType) {
            const target = selectedVendorType.toLowerCase().trim();
            result = result.filter(item => {
                const vt = item._raw?.vendor?.vendorType || item.vendor?.vendorType;
                return vt && String(vt).toLowerCase().trim().includes(target);
            });
        }

        // Cuisine filter
        if (selectedCuisine) {
            const target = selectedCuisine.toLowerCase().trim();
            result = result.filter(item => {
                const cat = item._raw?.category || item.category ||
                    (Array.isArray(item.tags) ? item.tags[0] : null);

                // Check simple string category
                if (cat && typeof cat === 'string') {
                    return cat.toLowerCase().trim().includes(target);
                }
                // Check if tags array contains target
                if (Array.isArray(item.categories)) {
                    return item.categories.some(c => String(c).toLowerCase().includes(target));
                }

                return false;
            });
        }

        // Haversine distance calculation
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

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'rating') {
                return (b.rating || 0) - (a.rating || 0);
            }
            if (sortBy === 'distance') {
                const latA = a._raw?.vendor?.latitude || a.vendor?.latitude;
                const lngA = a._raw?.vendor?.longitude || a.vendor?.longitude;
                const latB = b._raw?.vendor?.latitude || b.vendor?.latitude;
                const lngB = b._raw?.vendor?.longitude || b.vendor?.longitude;

                const distA = getDistance(userLat, userLng, latA, lngA);
                const distB = getDistance(userLat, userLng, latB, lngB);

                if (distA !== distB) return distA - distB;
            }
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return result;
    }, [deduplicatedItems, searchQuery, selectedVendorType, selectedCuisine, sortBy, currentLocation]);

    const handleRestaurantPress = (restaurant) => {
        navigation.navigate('RestaurantDetails', { restaurant });
    };

    const toggleVendorType = (vt) => {
        // Use name/slug for easier filtering
        const val = vt.slug || vt.name || vt.id;
        const safeVal = val ? String(val).toLowerCase().trim() : null;
        setSelectedVendorType(prev => prev === safeVal ? null : safeVal);
        setSelectedCuisine(null); // Reset cuisine when vendor changes
    };

    const toggleCuisine = (c) => {
        const val = c.slug || c.name || c.id;
        const safeVal = val ? String(val).toLowerCase().trim() : null;
        setSelectedCuisine(prev => prev === safeVal ? null : safeVal);
    };

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => handleRestaurantPress(item)}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
                backgroundColor="transparent"
                translucent={true}
                animated={true}
            />
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                    {title}
                </Text>
                <View style={styles.placeholder} />
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { 
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                shadowColor: colors.primary
            }]}>
                <Ionicons name="search" size={20} color={colors.primary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text.primary }]}
                    placeholder={t('search') || 'Search...'}
                    placeholderTextColor={colors.text.disabled || '#999'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    selectionColor={colors.primary}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButtonIcon}>
                        <Ionicons name="close-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Vendor Type Filter Chips - Replaced with GlovoBubbles */}
            {vendorTypes.length > 0 && (
                <View style={{ marginBottom: 4 }}>
                    <GlovoBubbles
                        categories={vendorTypes}
                        selectedId={selectedVendorType}
                        onPress={(cat) => toggleVendorType(cat)}
                        showTitle={false}
                    />
                </View>
            )}



            {/* Sort Options */}
            <View style={styles.sortRow}>
                <Text style={[styles.resultCount, { color: colors.text.secondary }]}>
                    {filteredItems.length} {filteredItems.length === 1 ? t('result') : t('results')}
                </Text>
                <View style={styles.sortButtons}>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'distance' && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => setSortBy('distance')}
                    >
                        <Ionicons name="location" size={16} color={sortBy === 'distance' ? colors.primary : colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'name' && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => setSortBy('name')}
                    >
                        <Ionicons name="text" size={16} color={sortBy === 'name' ? colors.primary : colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'rating' && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => setSortBy('rating')}
                    >
                        <Ionicons name="star" size={16} color={sortBy === 'rating' ? colors.primary : colors.text.secondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results List */}
            {filteredItems.length > 0 ? (
                <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || item._id || `item-${index}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="storefront-outline" size={64} color={colors.text.disabled} />
                    <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                        {t('noRestaurantsFound') || 'No results found'}
                    </Text>
                    {(selectedVendorType || selectedCuisine) && (
                        <TouchableOpacity
                            style={[styles.clearButton, { backgroundColor: colors.primary }]}
                            onPress={() => { setSelectedVendorType(null); setSelectedCuisine(null); }}
                        >
                            <Text style={styles.clearButtonText}>{t('clearFilters')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-SemiBold',
    },
    placeholder: {
        width: 32,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        height: '100%',
        paddingVertical: 0,
    },
    clearButtonIcon: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    filterRow: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginRight: spacing.sm,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterChipText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
    },
    sortRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
    },
    resultCount: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Regular',
    },
    sortButtons: {
        flexDirection: 'row',
    },
    sortButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.xs,
        borderRadius: 18,
        backgroundColor: '#F5F5F5', // Light gray background
        // shadow/elevation for depth
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Medium',
        marginTop: spacing.md,
        textAlign: 'center',
    },
    clearButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
    },
});

export default SeeAllScreen;
