import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { restaurant } = route.params;
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [cart, setCart] = useState({});
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock menu data - in real app, this would come from API
  const menuCategories = ['Popular', 'Burgers', 'Sides', 'Drinks', 'Desserts'];

  const menuItems = {
    Popular: [
      {
        id: 'm1',
        name: 'Double Whopper',
        description: 'Two flame-grilled beef patties with fresh ingredients',
        price: 12.99,
        image: '🍔',
        isPopular: true,
      },
      {
        id: 'm2',
        name: 'Chicken Royal',
        description: 'Crispy chicken fillet with lettuce and mayo',
        price: 9.99,
        image: '🍗',
        isPopular: true,
      },
      {
        id: 'm3',
        name: 'Veggie Burger',
        description: 'Plant-based patty with fresh vegetables',
        price: 8.99,
        image: '🥗',
        isPopular: true,
      },
    ],
    Burgers: [
      {
        id: 'm1',
        name: 'Double Whopper',
        description: 'Two flame-grilled beef patties with fresh ingredients',
        price: 12.99,
        image: '🍔',
      },
      {
        id: 'm4',
        name: 'Cheese Burger',
        description: 'Classic burger with cheese',
        price: 7.99,
        image: '🍔',
      },
      {
        id: 'm5',
        name: 'Bacon Burger',
        description: 'Beef patty with crispy bacon',
        price: 10.99,
        image: '🥓',
      },
    ],
    Sides: [
      {
        id: 'm6',
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 3.99,
        image: '🍟',
      },
      {
        id: 'm7',
        name: 'Onion Rings',
        description: 'Crispy battered onion rings',
        price: 4.99,
        image: '🧅',
      },
      {
        id: 'm8',
        name: 'Chicken Nuggets',
        description: '6 pieces of tender chicken nuggets',
        price: 5.99,
        image: '🍗',
      },
    ],
    Drinks: [
      {
        id: 'm9',
        name: 'Coca Cola',
        description: 'Chilled soft drink',
        price: 2.99,
        image: '🥤',
      },
      {
        id: 'm10',
        name: 'Orange Juice',
        description: 'Fresh orange juice',
        price: 3.99,
        image: '🧃',
      },
    ],
    Desserts: [
      {
        id: 'm11',
        name: 'Ice Cream Sundae',
        description: 'Vanilla ice cream with toppings',
        price: 4.99,
        image: '🍨',
      },
      {
        id: 'm12',
        name: 'Apple Pie',
        description: 'Warm apple pie',
        price: 3.99,
        image: '🥧',
      },
    ],
  };

  const addToCart = (item) => {
    setCart({
      ...cart,
      [item.id]: (cart[item.id] || 0) + 1,
    });
  };

  const removeFromCart = (item) => {
    if (cart[item.id] > 0) {
      const newCart = { ...cart };
      newCart[item.id] -= 1;
      if (newCart[item.id] === 0) {
        delete newCart[item.id];
      }
      setCart(newCart);
    }
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    let total = 0;
    Object.keys(cart).forEach((itemId) => {
      const item = Object.values(menuItems)
        .flat()
        .find((i) => i.id === itemId);
      if (item && item.price) {
        total += item.price * cart[itemId];
      }
    });
    return total.toFixed(2);
  };

  // Filter menu items based on search query
  const getFilteredMenuItems = () => {
    if (!searchQuery.trim()) {
      return menuItems[selectedCategory] || [];
    }

    const allItems = Object.values(menuItems).flat();
    return allItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderMenuItem = (item) => {
    const quantity = cart[item.id] || 0;

    return (
      <View key={item.id} style={styles(colors).menuItem}>
        <View style={styles(colors).menuItemLeft}>
          <Text style={styles(colors).menuItemImage}>{item.image}</Text>
          <View style={styles(colors).menuItemInfo}>
            <Text style={styles(colors).menuItemName}>{item.name}</Text>
            <Text style={styles(colors).menuItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles(colors).menuItemPrice}>€{item.price ? item.price.toFixed(2) : '0.00'}</Text>
          </View>
        </View>
        <View style={styles(colors).menuItemRight}>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles(colors).addButton}
              onPress={() => addToCart(item)}
            >
              <Text style={styles(colors).addButtonText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles(colors).quantityControl}>
              <TouchableOpacity
                style={styles(colors).quantityButton}
                onPress={() => removeFromCart(item)}
              >
                <Text style={styles(colors).quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles(colors).quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles(colors).quantityButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles(colors).quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container} edges={['top']}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>{restaurant.name}</Text>
        <TouchableOpacity
          style={styles(colors).searchButton}
          onPress={() => setSearchVisible(!searchVisible)}
        >
          <Ionicons name="search" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles(colors).searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.secondary} style={styles(colors).searchIcon} />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search menu items..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles(colors).scrollView} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles(colors).restaurantInfo}>
          <View style={styles(colors).restaurantHeader}>
            <Text style={styles(colors).restaurantIcon}>{restaurant.image}</Text>
            <View style={styles(colors).restaurantDetails}>
              <Text style={styles(colors).restaurantName}>{restaurant.name}</Text>
              <Text style={styles(colors).restaurantCategories}>
                {restaurant.categories?.join(' • ')}
              </Text>
              <View style={styles(colors).restaurantMeta}>
                <View style={styles(colors).metaItem}>
                  <Text style={styles(colors).metaIcon}>⭐</Text>
                  <Text style={styles(colors).metaText}>{restaurant.rating}</Text>
                </View>
                <View style={styles(colors).metaItem}>
                  <Text style={styles(colors).metaIcon}>🕐</Text>
                  <Text style={styles(colors).metaText}>{restaurant.deliveryTime}</Text>
                </View>
                <View style={styles(colors).metaItem}>
                  <Text style={styles(colors).metaIcon}>📍</Text>
                  <Text style={styles(colors).metaText}>{restaurant.distance}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles(colors).deliveryInfo}>
            <View style={styles(colors).deliveryInfoItem}>
              <Text style={styles(colors).deliveryInfoLabel}>Delivery Fee</Text>
              <Text style={styles(colors).deliveryInfoValue}>{restaurant.deliveryFee}</Text>
            </View>
            {restaurant.offer && (
              <View style={styles(colors).offerBadge}>
                <Text style={styles(colors).offerText}>{restaurant.offer}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles(colors).categoryTabs}
          contentContainerStyle={styles(colors).categoryTabsContent}
        >
          {menuCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles(colors).categoryTab,
                selectedCategory === category && styles(colors).categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles(colors).categoryTabText,
                  selectedCategory === category && styles(colors).categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles(colors).menuSection}>
          <Text style={styles(colors).menuSectionTitle}>
            {searchQuery ? `Search Results (${getFilteredMenuItems().length})` : selectedCategory}
          </Text>
          {getFilteredMenuItems().length > 0 ? (
            getFilteredMenuItems().map((item) => renderMenuItem(item))
          ) : (
            <View style={styles(colors).noResultsContainer}>
              <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
              <Text style={styles(colors).noResultsText}>No items found</Text>
              <Text style={styles(colors).noResultsSubtext}>Try searching with different keywords</Text>
            </View>
          )}
        </View>

        {/* Cart Footer - Inside ScrollView */}
        {getTotalItems() > 0 && (
          <View style={styles(colors).cartFooterInline}>
            <View style={styles(colors).cartFooterLeft}>
              <Text style={styles(colors).cartItemCount}>{getTotalItems()} items</Text>
              <Text style={styles(colors).cartTotal}>€{getTotalPrice()}</Text>
            </View>
            <TouchableOpacity
              style={styles(colors).viewCartButton}
              onPress={() => {
                // Navigate back to Main navigator and switch to Cart tab
                navigation.navigate('Main', { screen: 'Cart' });
              }}
            >
              <Text style={styles(colors).viewCartButtonText}>View Cart</Text>
              <Text style={styles(colors).viewCartButtonIcon}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing for tab bar + safe area */}
        <View style={{ height: Math.max(80, insets.bottom + 80) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  restaurantInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  restaurantIcon: {
    fontSize: 64,
    marginRight: spacing.md,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  restaurantCategories: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deliveryInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryInfoLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  deliveryInfoValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  offerBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  offerText: {
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
  categoryTabs: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTabText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  categoryTabTextActive: {
    color: colors.text.white,
  },
  menuSection: {
    padding: spacing.md,
  },
  menuSectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.md,
  },
  menuItemImage: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  menuItemDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  menuItemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  menuItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  quantityText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginHorizontal: spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  cartFooterInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartFooterLeft: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.white,
    opacity: 0.9,
  },
  cartTotal: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewCartButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  viewCartButtonIcon: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  noResultsText: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default RestaurantDetailsScreen;

