import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const StickySearchHeader = ({
  onCartPress,
  scrollY,
  onLocationPress,
  area,
  cartItemCount = 0,
  onSearch,
  searchQuery = '',
  suggestions = [],
  onSuggestionPress,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleSearchChange = (text) => {
    onSearch && onSearch(text);
  };

  const clearSearch = () => {
    onSearch && onSearch('');
  };

  const handleSuggestionTap = (suggestion) => {
    onSuggestionPress && onSuggestionPress(suggestion);
    setIsSearchFocused(false);
  };

  return (
    <Animated.View
      style={[styles(colors, isDarkMode).wrapper, { opacity: headerOpacity }]}
      pointerEvents="box-none"
    >
      <View style={styles(colors, isDarkMode).container}>
        {/* Row 1: Location & Cart (Clean, Minimal) - Hidden when searching */}
        {!isSearchFocused && (
          <View style={styles(colors, isDarkMode).topRow}>
            <TouchableOpacity
              style={styles(colors, isDarkMode).locationButton}
              onPress={onLocationPress}
              activeOpacity={0.7}
            >
              <Ionicons name="location-sharp" size={14} color={colors.text.white || '#FFFFFF'} />
              <Text style={styles(colors, isDarkMode).locationText} numberOfLines={1}>
                {area || 'Set location'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.text.white || '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors, isDarkMode).cartButtonTop}
              onPress={onCartPress}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={20} color={colors.text.white || '#FFFFFF'} />
              {cartItemCount > 0 && (
                <View style={styles(colors, isDarkMode).badge}>
                  <Text style={styles(colors, isDarkMode).badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Row 2: Search Bar (PROMINENT, CLEAN) */}
        <View style={styles(colors, isDarkMode).searchRow}>
          {/* Back button (only when searching) */}
          {isSearchFocused && (
            <TouchableOpacity
              style={styles(colors, isDarkMode).backButton}
              onPress={() => {
                setIsSearchFocused(false);
                if (searchQuery) clearSearch();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text.white || '#FFFFFF'} />
            </TouchableOpacity>
          )}

          {/* Search Input - FULL WIDTH, CLEAN */}
          <View style={[
            styles(colors, isDarkMode).searchContainer,
            isSearchFocused && styles(colors, isDarkMode).searchContainerFocused
          ]}>
            <Ionicons
              name="search"
              size={18}
              color={isSearchFocused ? colors.primary : colors.text.secondary}
              style={styles(colors, isDarkMode).searchIcon}
            />
            <TextInput
              style={styles(colors, isDarkMode).input}
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles(colors, isDarkMode).clearButton}>
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Autocomplete Suggestions Dropdown - OUTSIDE container for proper positioning */}
      {isSearchFocused && searchQuery.length > 0 && suggestions.length > 0 && (
        <View style={styles(colors, isDarkMode).suggestionsWrapper}>
          <View style={styles(colors, isDarkMode).suggestionsContainer}>
            <ScrollView
              style={styles(colors, isDarkMode).suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.id || index}
                  style={[
                    styles(colors, isDarkMode).suggestionItem,
                    index === suggestions.length - 1 && styles(colors, isDarkMode).suggestionItemLast
                  ]}
                  onPress={() => handleSuggestionTap(suggestion)}
                  activeOpacity={0.7}
                >
                  <View style={styles(colors, isDarkMode).suggestionIconWrapper}>
                    <Ionicons name="search" size={18} color={colors.primary} />
                  </View>
                  <View style={styles(colors, isDarkMode).suggestionContent}>
                    <Text style={styles(colors, isDarkMode).suggestionName} numberOfLines={1}>
                      {suggestion.name}
                    </Text>
                    {suggestion.cuisine && (
                      <Text style={styles(colors, isDarkMode).suggestionCuisine} numberOfLines={1}>
                        {suggestion.cuisine}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  container: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  // Row 1: Location & Cart - COMPACT
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    height: 28,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    color: colors.text.white || '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginLeft: 4,
    marginRight: 3,
    flex: 1,
  },
  cartButtonTop: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Row 2: Search - COMPACT
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainerFocused: {
    shadowOpacity: 0.15,
    elevation: 8,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    padding: 0,
    height: 32,
  },
  clearButton: {
    padding: spacing.xs - 2,
    marginLeft: spacing.xs,
  },
  // Badge - COMPACT
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFD700',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  // Suggestions Dropdown Wrapper & Container
  suggestionsWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  suggestionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 320,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight || 'rgba(255, 105, 180, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  suggestionCuisine: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
});

export default StickySearchHeader;

