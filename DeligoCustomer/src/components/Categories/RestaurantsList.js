import React from "react";
import {
    View,
    FlatList,
} from "react-native";

import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';

export function RestaurantsList({ restaurants = [], onPress = () => {}, searchQuery: _searchQuery = '', disableScroll = false }) {
    // IMPORTANT: this component should render ONLY the provided list.
    // Falling back to context products causes "all products" to show when a vendor list is empty.
    const data = Array.isArray(restaurants) ? restaurants : [];

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
