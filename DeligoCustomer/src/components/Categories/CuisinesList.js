import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import CuisineChip from '../CuisineChip';
import { spacing } from '../../theme';

/**
 * CuisinesList Component
 *
 * Renders a horizontal scrollable list of cuisine chips.
 * Supports robust selection logic matching by ID, slug, or name.
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} [props.cuisines=[]] - List of cuisine objects
 * @param {string|number} [props.selectedCuisine=null] - The identifier of the selected cuisine (ID, slug, or name)
 * @param {Function} [props.onPress] - Callback function when a cuisine is pressed
 * @returns {JSX.Element} The rendered CuisinesList component
 */
const CuisinesList = ({ cuisines = [], selectedCuisine = null, onPress = () => { } }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {cuisines.map((cuisine) => {
        const isSelected = selectedCuisine === cuisine.id ||
          selectedCuisine === cuisine.slug ||
          (selectedCuisine && cuisine.name && selectedCuisine.toLowerCase() === cuisine.name.toLowerCase());

        return (
          <CuisineChip
            key={cuisine.id}
            cuisine={cuisine}
            onPress={() => onPress(cuisine)}
            isSelected={isSelected}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});

export default CuisinesList;

