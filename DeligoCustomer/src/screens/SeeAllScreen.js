import React, { useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Text,
    ScrollView,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { spacing, fontSize, borderRadius } from '../theme';
import RestaurantCard from '../components/RestaurantCard';

const SeeAllScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    // Get data passed from CategoriesScreen
    const {
        allItems = [],
        vendorTypes = [],
        availableCuisines = [],
        title = t('nearYou')
    } = route.params || {};

    // Filter and sort state
    const [selectedVendorType, setSelectedVendorType] = useState(null);
    const [selectedCuisine, setSelectedCuisine] = useState(null);
    const [sortBy, setSortBy] = useState('name'); // 'name', 'rating', 'distance'
    const [searchQuery, setSearchQuery] = useState('');

    // Deduplicate items by vendor name
    const deduplicatedItems = useMemo(() => {
        const map = new Map();
        for (const p of allItems) {
            const vendorName = (p && (p._raw?.vendor?.vendorName || p.vendor?.vendorName || p.name)) || '';
            const key = String(vendorName || '').trim().toLowerCase();
            if (!map.has(key) && key) {
                map.set(key, { ...p, name: vendorName || (p && p.name) || '' });
            }
        }
        return Array.from(map.values());
    }, [allItems]);

    // Filter items based on selections
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
            result = result.filter(item => {
                const vt = item._raw?.vendor?.vendorType || item.vendor?.vendorType;
                return String(vt).trim() === selectedVendorType;
            });
        }

        // Cuisine filter
        if (selectedCuisine) {
            result = result.filter(item => {
                const cat = item._raw?.category || item.category ||
                    (Array.isArray(item.tags) ? item.tags[0] : null);
                return String(cat).trim() === selectedCuisine;
            });
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'rating') {
                return (b.rating || 0) - (a.rating || 0);
            }
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return result;
    }, [deduplicatedItems, searchQuery, selectedVendorType, selectedCuisine, sortBy]);

    const handleRestaurantPress = (restaurant) => {
        navigation.navigate('RestaurantDetails', { restaurant });
    };

    const toggleVendorType = (vt) => {
        setSelectedVendorType(prev => prev === vt ? null : vt);
        setSelectedCuisine(null); // Reset cuisine when vendor changes
    };

    const toggleCuisine = (c) => {
        setSelectedCuisine(prev => prev === c ? null : c);
    };

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => handleRestaurantPress(item)}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
            <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                <Ionicons name="search" size={20} color={colors.text.secondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text.primary }]}
                    placeholder={t('search') || 'Search...'}
                    placeholderTextColor={colors.text.disabled}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Vendor Type Filter Chips */}
            {vendorTypes.length > 0 && (
                <View style={{ height: 50, marginBottom: 4 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterRow}
                    >
                        {vendorTypes.map((vt) => (
                            <TouchableOpacity
                                key={vt.id}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: selectedVendorType === vt.id ? colors.primary : colors.surface }
                                ]}
                                onPress={() => toggleVendorType(vt.id)}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    { color: selectedVendorType === vt.id ? '#fff' : colors.text.primary }
                                ]}>
                                    {vt.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Sort Options */}
            <View style={styles.sortRow}>
                <Text style={[styles.resultCount, { color: colors.text.secondary }]}>
                    {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
                </Text>
                <View style={styles.sortButtons}>
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
                            <Text style={styles.clearButtonText}>Clear Filters</Text>
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
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        paddingVertical: 0, // Remove extra vertical padding
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
        padding: spacing.xs,
        marginLeft: spacing.xs,
        borderRadius: borderRadius.sm,
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
