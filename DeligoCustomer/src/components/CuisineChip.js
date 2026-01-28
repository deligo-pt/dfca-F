import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Image, View } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

/**
 * Utility: getFallbackIcon
 * 
 * Determines a semantic emoji based on the cuisine name keyword.
 * Used as a fallback when the backend image fails to load.
 * 
 * @param {Object} cuisine - Cuisine data object.
 * @returns {string} Emoji character.
 */
const getFallbackIcon = (cuisine) => {
  const name = (cuisine.name || cuisine.slug || cuisine.id || '').toLowerCase();

  // Keyword matching for cuisine types
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger')) return '🍔';
  if (name.includes('chinese') || name.includes('noodle')) return '🥡';
  if (name.includes('indian') || name.includes('curry')) return '🍛';
  if (name.includes('healthy') || name.includes('salad')) return '🥗';
  if (name.includes('dessert') || name.includes('sweet') || name.includes('cake')) return '🍰';
  if (name.includes('coffee') || name.includes('cafe')) return '☕';
  if (name.includes('dairy') || name.includes('milk')) return '🥛';
  if (name.includes('fruit')) return '🍎';
  if (name.includes('snack')) return '🍪';
  if (name.includes('beverage') || name.includes('drink')) return '🥤';
  if (name.includes('frozen') || name.includes('ice')) return '🧊';
  if (name.includes('household') || name.includes('home')) return '🧹';
  if (name.includes('pharmacy') || name.includes('medicine')) return '💊';
  if (name.includes('sushi') || name.includes('japanese')) return '🍣';
  if (name.includes('thai')) return '🍜';
  if (name.includes('mexican') || name.includes('taco')) return '🌮';
  if (name.includes('chicken')) return '🍗';
  if (name.includes('seafood') || name.includes('fish')) return '🐟';

  return '🍽️';
};

/**
 * CuisineChip Component
 * 
 * Interactive filter chip for cuisine categories.
 * Updated Style: Circular Vertical (Swiggy Dosa Style).
 * 
 * @param {Object} props
 * @param {Object} props.cuisine - Data object (name, icon URL).
 * @param {Function} props.onPress - Tap handler.
 * @param {boolean} [props.isSelected=false] - Active state.
 */
const CuisineChip = ({ cuisine, onPress, isSelected = false }) => {
  const { colors, isDarkMode } = useTheme();
  const [imageError, setImageError] = React.useState(false);

  // Extract the preferred icon source
  const rawIcon = cuisine.icon || cuisine.image;

  // Validate the URL format for basic sanity check
  const isValidImageUrl = rawIcon &&
    typeof rawIcon === 'string' &&
    rawIcon.trim().startsWith('http') &&
    rawIcon.trim().length > 15;

  const fallbackIcon = getFallbackIcon(cuisine);

  // Determine display strategy: Valid Image -> Fallback Emoji
  const showImage = isValidImageUrl && !imageError;
  const backgroundColor = isSelected ? colors.primaryLight : '#f5f5f5';

  return (
    <TouchableOpacity
      style={styles(colors, isDarkMode).container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles(colors, isDarkMode).imageContainer,
        {
          backgroundColor: backgroundColor,
          borderColor: isSelected ? colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0
        }
      ]}>
        {showImage ? (
          <Image
            source={{ uri: rawIcon }}
            style={styles(colors, isDarkMode).chipImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text style={[styles(colors, isDarkMode).emojiIcon, { color: colors.primary }]}>
            {fallbackIcon}
          </Text>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={[styles(colors, isDarkMode).name, isSelected && styles(colors, isDarkMode).selectedText]}
      >
        {cuisine.name}
      </Text>
    </TouchableOpacity>
  );
};

export default CuisineChip;

const styles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    width: 85,          // Fixed width for vertical column alignment
    alignItems: 'center',
    marginRight: 4,
  },
  imageContainer: {
    width: 74,          // Large circular image
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  emojiIcon: {
    fontSize: 28,
  },
  chipImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: colors.text.primary,
    fontSize: 12, // Industry Standard
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    lineHeight: 16,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  selectedText: {
    color: colors.primary,
  },
});
