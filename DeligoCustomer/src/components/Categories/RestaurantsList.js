import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RestaurantCard from '../RestaurantCard';
import { spacing } from '../../theme';
import { useTheme } from '../../utils/ThemeContext';

export function RestaurantsList({ restaurants = [], onPress = () => {}, searchQuery = '' }) {
  const { colors } = useTheme();

  if (restaurants.length === 0 && searchQuery) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg }}>
        <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
        <Text style={{ fontSize: 18, fontFamily: 'Poppins-SemiBold', color: colors.text.primary, marginTop: spacing.md, textAlign: 'center' }}>No restaurants found</Text>
        <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' }}>Try searching with different keywords</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: spacing.xs }}>
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} onPress={() => onPress(restaurant)} />
      ))}
    </View>
  );
}

export default RestaurantsList;
