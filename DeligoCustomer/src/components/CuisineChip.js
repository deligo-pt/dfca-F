import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

// Helper function to get fallback icon based on cuisine name
const getFallbackIcon = (cuisine) => {
  const name = (cuisine.name || cuisine.slug || cuisine.id || '').toLowerCase();

  // Match by common cuisine keywords
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

  // Default fallback
  return '🍽️';
};

const CuisineChip = ({ cuisine, onPress, isSelected = false }) => {
  const { colors, isDarkMode } = useTheme();
  const [imageError, setImageError] = React.useState(false);

  // Get the icon from cuisine data
  const rawIcon = cuisine.icon || cuisine.image;

  // Validate if icon is a valid URL
  const isValidImageUrl = rawIcon &&
    typeof rawIcon === 'string' &&
    rawIcon.trim().startsWith('http') &&
    rawIcon.trim().length > 15;

  // Get fallback icon
  const fallbackIcon = getFallbackIcon(cuisine);

  // Determine what to display
  const showImage = isValidImageUrl && !imageError;

  return (
    <TouchableOpacity
      style={[styles(colors, isDarkMode).container, isSelected && styles(colors, isDarkMode).selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showImage ? (
        <Image
          source={{ uri: rawIcon }}
          style={styles(colors, isDarkMode).chipImage}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={styles(colors, isDarkMode).icon}>{fallbackIcon}</Text>
      )}
      <Text style={[styles(colors, isDarkMode).name, isSelected && styles(colors, isDarkMode).selectedText]}>{cuisine.name}</Text>
    </TouchableOpacity>
  );
};

export default CuisineChip;

const styles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.surface : (colors.surfaceVariant || '#F0F2F5'),
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.sm,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  icon: {
    marginRight: spacing.xs,
  },
  chipImage: {
    width: 20,
    height: 20,
    marginRight: spacing.xs,
  },
  name: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
  },
  selectedText: {
    color: colors.text.white || '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
});

