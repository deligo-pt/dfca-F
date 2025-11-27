import React from 'react';
import { ScrollView } from 'react-native';
import CuisineChip from '../CuisineChip';
import { spacing } from '../../theme';

export default function CuisinesList({ cuisines = [], selectedCuisine = null, onPress = () => {} }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
      {cuisines.map((cuisine) => (
        <CuisineChip key={cuisine.id} cuisine={cuisine} onPress={() => onPress(cuisine)} isSelected={selectedCuisine === cuisine.id} />
      ))}
    </ScrollView>
  );
}
