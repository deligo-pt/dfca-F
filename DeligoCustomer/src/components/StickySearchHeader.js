import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';

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
      style={[styles.wrapper, { opacity: headerOpacity }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Row 1: Location & Cart (Clean, Minimal) - Hidden when searching */}
        {!isSearchFocused && (
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={onLocationPress}
              activeOpacity={0.7}
            >
              <Ionicons name="location-sharp" size={14} color="#FFFFFF" />
              <Text style={styles.locationText} numberOfLines={1}>
                {area || 'Set location'}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cartButtonTop}
              onPress={onCartPress}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              {cartItemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Row 2: Search Bar (PROMINENT, CLEAN) */}
        <View style={styles.searchRow}>
          {/* Back button (only when searching) */}
          {isSearchFocused && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setIsSearchFocused(false);
                if (searchQuery) clearSearch();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Search Input - FULL WIDTH, CLEAN */}
          <View style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused
          ]}>
            <Ionicons
              name="search"
              size={18}
              color={isSearchFocused ? colors.primary : "#999999"}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor="#999999"
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
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#999999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Autocomplete Suggestions Dropdown - OUTSIDE container for proper positioning */}
      {isSearchFocused && searchQuery.length > 0 && suggestions.length > 0 && (
        <View style={styles.suggestionsWrapper}>
          <View style={styles.suggestionsContainer}>
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.id || index}
                  style={[
                    styles.suggestionItem,
                    index === suggestions.length - 1 && styles.suggestionItemLast
                  ]}
                  onPress={() => handleSuggestionTap(suggestion)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIconWrapper}>
                    <Ionicons name="search" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {suggestion.name}
                    </Text>
                    {suggestion.cuisine && (
                      <Text style={styles.suggestionCuisine} numberOfLines={1}>
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

const styles = StyleSheet.create({
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
    shadowColor: '#000',
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: '#000',
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
    color: '#333333',
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
    color: '#333333',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
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
    borderBottomColor: '#F5F5F5',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5F1',
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
    color: '#333333',
    marginBottom: 2,
  },
  suggestionCuisine: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
});

export default StickySearchHeader;

