import React from 'react';
import { ScrollView } from 'react-native';
import { spacing } from '../../theme';
import CategoryCard from '../CategoryCard';

export function CategoriesList({ categories = [], onPress = () => {} }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} onPress={() => onPress(category)} />
      ))}
    </ScrollView>
  );
}

export default CategoriesList;
