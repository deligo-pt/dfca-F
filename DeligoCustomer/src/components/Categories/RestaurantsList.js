import React from "react";
import {
    View,
    FlatList,
} from "react-native";

import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';
import { useProducts } from '../../contexts/ProductsContext';

export function RestaurantsList({ restaurants = [], onPress = () => {}, searchQuery: _searchQuery = '', disableScroll = false }) {
    const { products: ctxProducts } = useProducts();

    // Prefer passed-in restaurants prop, otherwise use context products
    const data = (restaurants && restaurants.length) ? restaurants : (ctxProducts || []);

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => onPress(item)}
        />
    );

    // Don't show loading/error states here - let parent handle them with skeleton
    // This prevents flickering when switching filters

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


export default RestaurantsList;
