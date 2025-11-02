import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

const CartScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Mock cart data - in real app, this would come from global state/context
  const [cartItems, setCartItems] = useState([
    {
      id: 'm1',
      name: 'Double Whopper',
      description: 'Two flame-grilled beef patties with fresh ingredients',
      price: 12.99,
      quantity: 2,
      image: '🍔',
      restaurant: 'Burger King',
    },
    {
      id: 'm6',
      name: 'French Fries',
      description: 'Crispy golden fries',
      price: 3.99,
      quantity: 1,
      image: '🍟',
      restaurant: 'Burger King',
    },
    {
      id: 'm9',
      name: 'Coca Cola',
      description: 'Chilled soft drink',
      price: 2.99,
      quantity: 2,
      image: '🥤',
      restaurant: 'Burger King',
    },
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const deliveryFee = 0; // Free delivery
  const serviceFee = 1.99;
  const discount = appliedPromo ? 5.00 : 0;

  const updateQuantity = (itemId, delta) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotal = () => {
    return getSubtotal() + deliveryFee + serviceFee - discount;
  };

  const applyPromoCode = () => {
    if (promoCode.toUpperCase() === 'SAVE5') {
      setAppliedPromo({ code: 'SAVE5', discount: 5.00 });
    } else {
      alert(t('invalidPromoCode'));
    }
  };

  const renderCartItem = (item) => (
    <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemImage}>{item.image}</Text>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text.primary }]}>{item.name}</Text>
          <Text style={[styles.itemDescription, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.itemPrice, { color: colors.primary }]}>€{item.price.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.quantityControl, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.primary }]}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.quantityText, { color: colors.text.primary }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.primary }]}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart')}</Text>
        </View>
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartIcon}>🛒</Text>
          <Text style={[styles.emptyCartTitle, { color: colors.text.primary }]}>{t('cartEmpty')}</Text>
          <Text style={[styles.emptyCartText, { color: colors.text.secondary }]}>
            {t('addItemsToGetStarted')}
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Categories')}
          >
            <Text style={styles.browseButtonText}>{t('browseRestaurants')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} mode="padding">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart')}</Text>
        <TouchableOpacity onPress={() => setCartItems([])}>
          <Text style={[styles.clearAllText, { color: colors.primary }]}>{t('clearAll')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Restaurant Info */}
        <View style={[styles.restaurantSection, { backgroundColor: colors.surface }]}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantIcon}>🍔</Text>
            <View style={styles.restaurantInfo}>
              <Text style={[styles.restaurantName, { color: colors.text.primary }]}>Burger King</Text>
              <View style={styles.restaurantMeta}>
                <Text style={[styles.metaText, { color: colors.text.secondary }]}>⭐ 4.5</Text>
                <Text style={[styles.metaDot, { color: colors.text.light }]}>•</Text>
                <Text style={[styles.metaText, { color: colors.text.secondary }]}>25-35 min</Text>
                <Text style={[styles.metaDot, { color: colors.text.light }]}>•</Text>
                <Text style={[styles.metaText, { color: colors.text.secondary }]}>1.2 km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cart Items */}
        <View style={[styles.cartSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('yourOrder')}</Text>
          {cartItems.map((item) => renderCartItem(item))}
        </View>

        {/* Add More Items */}
        <TouchableOpacity
          style={[styles.addMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={[styles.addMoreIcon, { color: colors.primary }]}>+</Text>
          <Text style={[styles.addMoreText, { color: colors.primary }]}>{t('addMoreItems')}</Text>
        </TouchableOpacity>

        {/* Promo Code */}
        <View style={[styles.promoSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('promoCode')}</Text>
          {appliedPromo ? (
            <View style={styles.appliedPromo}>
              <View style={styles.appliedPromoLeft}>
                <Text style={styles.appliedPromoIcon}>🎉</Text>
                <View>
                  <Text style={styles.appliedPromoCode}>{appliedPromo.code}</Text>
                  <Text style={styles.appliedPromoDiscount}>
                    -€{appliedPromo.discount.toFixed(2)} {t('discountApplied')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAppliedPromo(null)}>
                <Text style={styles.removePromoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={[styles.promoInput, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border }]}
                placeholder={t('enterPromoCode')}
                placeholderTextColor={colors.text.light}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primary }]} onPress={applyPromoCode}>
                <Text style={styles.applyButtonText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delivery Instructions */}
        <View style={[styles.instructionsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('deliveryInstructions')}</Text>
          <TextInput
            style={[styles.instructionsInput, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border }]}
            placeholder={t('addDeliveryInstructions')}
            placeholderTextColor={colors.text.light}
            multiline
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            numberOfLines={3}
          />
        </View>

        {/* Price Breakdown */}
        <View style={[styles.priceSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('billSummary')}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>{t('subtotal')}</Text>
            <Text style={[styles.priceValue, { color: colors.text.primary }]}>€{getSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>{t('deliveryFee')}</Text>
            {deliveryFee === 0 ? (
              <Text style={[styles.priceFree, { color: colors.success }]}>{t('free')}</Text>
            ) : (
              <Text style={[styles.priceValue, { color: colors.text.primary }]}>€{deliveryFee.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>{t('serviceFee')}</Text>
            <Text style={[styles.priceValue, { color: colors.text.primary }]}>€{serviceFee.toFixed(2)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>{t('discount')}</Text>
              <Text style={[styles.priceDiscount, { color: colors.success }]}>-€{discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>{t('total')}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>€{getTotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Checkout Button - Inside ScrollView */}
        <View style={[styles.checkoutButtonContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.totalBarInline, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.checkoutItemCount, { color: colors.text.secondary }]}>
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
              </Text>
              <Text style={[styles.checkoutTotal, { color: colors.primary }]}>€{getTotal().toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              const cartData = {
                items: cartItems,
                subtotal: getSubtotal(),
                deliveryFee: deliveryFee,
                serviceFee: serviceFee,
                discount: discount,
                total: getTotal(),
                deliveryInstructions: deliveryInstructions,
                promoCode: appliedPromo?.code,
              };
              navigation.navigate('Checkout', { cartData });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutButtonText}>{t('checkout')}</Text>
            <View style={styles.checkoutButtonArrow}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing for safe area and tab bar */}
        <View style={{ height: Math.max(100, insets.bottom + 90) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
  },
  clearAllText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
  },
  scrollView: {
    flex: 1,
  },
  restaurantSection: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.xs,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  metaDot: {
    fontSize: fontSize.sm,
    marginHorizontal: spacing.xs,
  },
  cartSection: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.sm,
  },
  itemImage: {
    fontSize: 40,
    marginRight: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  quantityText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginHorizontal: spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    marginTop: spacing.xs,
  },
  removeButtonText: {
    fontSize: 18,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMoreIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  addMoreText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  promoSection: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  promoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  applyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  applyButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  appliedPromo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedPromoIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  appliedPromoCode: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: '#2E7D32',
  },
  appliedPromoDiscount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: '#388E3C',
  },
  removePromoText: {
    fontSize: fontSize.lg,
    color: '#2E7D32',
    paddingHorizontal: spacing.sm,
  },
  instructionsSection: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  instructionsInput: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceSection: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
  },
  priceValue: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  priceFree: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  priceDiscount: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  checkoutButtonContainer: {
    marginHorizontal: spacing.lg,
    marginTop: 12,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  totalBarInline: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  checkoutItemCount: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginBottom: 2,
  },
  checkoutTotal: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  checkoutButtonArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCartIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  emptyCartTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.sm,
  },
  emptyCartText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  browseButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  browseButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default CartScreen;
