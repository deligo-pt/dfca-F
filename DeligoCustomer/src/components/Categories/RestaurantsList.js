import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';

/**
 * RestaurantsList Component
 * 
 * Renders a list of RestaurantCard components.
 * Supports flat list virtualization or static mapping for nested scroll views.
 * 
 * @param {Object} props
 * @param {Array} props.restaurants - Data source.
 * @param {Function} props.onPress - Item tap handler.
 * @param {boolean} [props.disableScroll=false] - Use static View instead of FlatList.
 */
export function RestaurantsList({
    restaurants = [],
    onPress = () => { },
    disableScroll = false
}) {
    // Ensure data is always an array to prevent render errors
    const data = Array.isArray(restaurants) ? restaurants : [];

    const renderItem = ({ item }) => (
        <RestaurantCard
            restaurant={item}
            onPress={() => onPress(item)}
        />
    );

    // If rendered within a parent ScrollView, use a standard Map to avoid
    // nested VirtualizedList warnings and scroll conflicts.
    if (disableScroll) {
        return (
            <View style={styles.staticContainer}>
                {data.map((item) => (
                    <RestaurantCard
                        key={item.id || item._id}
                        restaurant={item}
                        onPress={() => onPress(item)}
                    />
                ))}
            </View>
        );
    }

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id || item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
        />
    );
}

const styles = StyleSheet.create({
    staticContainer: {
        paddingTop: spacing.xs,
    },
    listContent: {
        padding: spacing.md,
    },
});

export default RestaurantsList;

