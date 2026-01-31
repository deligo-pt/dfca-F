import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { getAuthHeaders } from '../utils/auth';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import RestaurantCard from '../components/RestaurantCard';
import SectionHeader from '../components/SectionHeader';

const FavoriteOrdersScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFavorites = async () => {
        try {
            const headers = await getAuthHeaders();
            // Adjust endpoint if needed based on API documentation or error
            const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.PROFILE.FAVORITES}`, {
                method: 'GET',
                headers,
            });
            const json = await response.json();

            if (json.success && Array.isArray(json.data)) {
                setFavorites(json.data);
            } else {
                setFavorites([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFavorites();
    };

    const renderItem = ({ item }) => {
        return (
            <View style={styles.cardContainer}>
                <RestaurantCard
                    restaurant={item}
                    onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item._id, restaurant: item })}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <SectionHeader title={t('favoriteOrders') || 'Favorite Orders'} onBack={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    contentContainerStyle={[styles.listContent, favorites.length === 0 && styles.listContentEmpty]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="heart" size={48} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                                {t('noFavorites')}
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                                {t('addFavoritesHint') || "Save your favorite restaurants to order quickly next time!"}
                            </Text>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                onPress={() => navigation.navigate('Main')}
                            >
                                <Text style={styles.actionButtonText}>{t('exploreRestaurants') || "Explore Restaurants"}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    listContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    cardContainer: {
        marginBottom: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: -50,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});

export default FavoriteOrdersScreen;
