import React from "react";
import {
    View,
    Text,
    ActivityIndicator,
    FlatList,
    StyleSheet,
} from "react-native";

import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';
import { useProducts } from '../../contexts/ProductsContext';

export function RestaurantsList({ restaurants = [], onPress = () => {}, searchQuery: _searchQuery = '', disableScroll = false }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { products: ctxProducts, loading: ctxLoading, error: ctxError } = useProducts();

    // Prefer passed-in restaurants prop, otherwise use context products
    const data = (restaurants && restaurants.length) ? restaurants : (ctxProducts || []);
    const loading = !!ctxLoading;
    const error = ctxError;

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => onPress(item)}
        />
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text.primary }]}>{t('loadingProducts') || 'Loading...'}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.error }]}>Failed to load products</Text>
                <Text style={[styles.errorText, { color: colors.error }]}>{String(error)}</Text>
            </View>
        );
    }

    // If this list is being rendered inside another vertical ScrollView, avoid nesting a FlatList.
    if (disableScroll) {
        return (
            <View style={{ paddingTop: spacing.xs }}>
                {data.map((item) => (
                    <RestaurantCard key={item.id || item._id} restaurant={item} onPress={() => onPress(item)} />
                ))}
            </View>
        );
    }

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id || item._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
        />
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        fontFamily: "Poppins-Regular",
        marginTop: 10,
    },
    errorText: {
        textAlign: "center",
        fontFamily: "Poppins-Regular",
    },
    noDataText: {
        fontFamily: "Poppins-Regular",
        fontSize: 16,
    },
});

export default RestaurantsList;
