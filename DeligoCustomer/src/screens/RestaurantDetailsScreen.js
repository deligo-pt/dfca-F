import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { restaurant } = route.params;
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [cart, setCart] = useState({});

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

  const renderMenuItem = (item) => {
    const quantity = cart[item.id] || 0;

    return (
      <View key={item.id} style={styles.menuItem}>
        <View style={styles.menuItemLeft}>
          <Text style={styles.menuItemImage}>{item.image}</Text>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemName}>{item.name}</Text>
            <Text style={styles.menuItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.menuItemPrice}>€{item.price ? item.price.toFixed(2) : '0.00'}</Text>
          </View>
        </View>
        <View style={styles.menuItemRight}>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => removeFromCart(item)}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{restaurant.name}</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantIcon}>{restaurant.image}</Text>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantCategories}>
                {restaurant.categories?.join(' • ')}
              </Text>
              <View style={styles.restaurantMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⭐</Text>
                  <Text style={styles.metaText}>{restaurant.rating}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>🕐</Text>
                  <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText}>{restaurant.distance}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>Delivery Fee</Text>
              <Text style={styles.deliveryInfoValue}>{restaurant.deliveryFee}</Text>
            </View>
            {restaurant.offer && (
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>{restaurant.offer}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {menuCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                selectedCategory === category && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>{selectedCategory}</Text>
          {menuItems[selectedCategory]?.map((item) => renderMenuItem(item))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Cart Footer */}
      {getTotalItems() > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.cartFooterLeft}>
            <Text style={styles.cartItemCount}>{getTotalItems()} items</Text>
            <Text style={styles.cartTotal}>€{getTotalPrice()}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => {
              // Navigate back to Main navigator and switch to Cart tab
              navigation.navigate('Main', { screen: 'Cart' });
            }}
          >
            <Text style={styles.viewCartButtonText}>View Cart</Text>
            <Text style={styles.viewCartButtonIcon}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text.primary,
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
  },
  searchButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  restaurantInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
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
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
});

export default RestaurantDetailsScreen;

