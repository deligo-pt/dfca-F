import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    FlatList,

    StyleSheet,
} from "react-native";

import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import { getAccessToken } from "../../utils/storage";
import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';

import { BASE_API_URL, API_ENDPOINTS } from "../../constants/config";

const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PRODUCTS.GET_ALL}`;

export function RestaurantsList({ restaurants = [], onPress = () => {}, searchQuery = '', disableScroll = false }) {
    const { colors } = useTheme();
    const { t } = useLanguage();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const accessToken = await getAccessToken();

                const response = await fetch(API_URL, {
                    method: "GET",
                    headers: {
                        "Authorization": accessToken,
                        "Accept": "application/json",
                    },
                });

                if (!response.ok) {
                    setError(`Error ${response.status}: ${response.statusText}`);
                    setLoading(false);
                    return;
                }

                const json = await response.json();
                setProducts(json.data || json.products || []);
            } catch (err) {
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text.primary }]}>
                    {t("loadingProducts")}
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.error }]}>Failed to load products</Text>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
        );
    }

    if (products.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.noDataText, { color: colors.text.primary }]}>
                    {t("noProductsFound")}
                </Text>
            </View>
        );
    }

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => onPress(item)}
        />
    );

    // If this list is being rendered inside another vertical ScrollView, avoid nesting a FlatList.
    if (disableScroll) {
        return (
            <View style={{ paddingTop: spacing.xs }}>
                {products.map((item) => (
                    <RestaurantCard key={item.id || item._id} restaurant={item} onPress={() => onPress(item)} />
                ))}
            </View>
        );
    }

    return (
        <FlatList
            data={products}
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
