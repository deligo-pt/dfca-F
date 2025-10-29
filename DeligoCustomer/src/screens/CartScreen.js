import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';

const CartScreen = ({ navigation }) => {
  const { t } = useLanguage();
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
    <View key={item.id} style={styles.cartItem}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemImage}>{item.image}</Text>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.itemPrice}>€{item.price.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cart')}</Text>
        </View>
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartIcon}>🛒</Text>
          <Text style={styles.emptyCartTitle}>{t('cartEmpty')}</Text>
          <Text style={styles.emptyCartText}>
            {t('addItemsToGetStarted')}
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Categories')}
          >
            <Text style={styles.browseButtonText}>{t('browseRestaurants')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} mode="padding">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('cart')}</Text>
        <TouchableOpacity onPress={() => setCartItems([])}>
          <Text style={styles.clearAllText}>{t('clearAll')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Restaurant Info */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantIcon}>🍔</Text>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>Burger King</Text>
              <View style={styles.restaurantMeta}>
                <Text style={styles.metaText}>⭐ 4.5</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>25-35 min</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>1.2 km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cart Items */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>{t('yourOrder')}</Text>
          {cartItems.map((item) => renderCartItem(item))}
        </View>

        {/* Add More Items */}
        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.addMoreIcon}>+</Text>
          <Text style={styles.addMoreText}>{t('addMoreItems')}</Text>
        </TouchableOpacity>

        {/* Promo Code */}
        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>{t('promoCode')}</Text>
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
                style={styles.promoInput}
                placeholder={t('enterPromoCode')}
                placeholderTextColor={colors.text.light}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.applyButton} onPress={applyPromoCode}>
                <Text style={styles.applyButtonText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delivery Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>{t('deliveryInstructions')}</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder={t('addDeliveryInstructions')}
            placeholderTextColor={colors.text.light}
            multiline
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            numberOfLines={3}
          />
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>{t('billSummary')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('subtotal')}</Text>
            <Text style={styles.priceValue}>€{getSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('deliveryFee')}</Text>
            {deliveryFee === 0 ? (
              <Text style={styles.priceFree}>{t('free')}</Text>
            ) : (
              <Text style={styles.priceValue}>€{deliveryFee.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('serviceFee')}</Text>
            <Text style={styles.priceValue}>€{serviceFee.toFixed(2)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('discount')}</Text>
              <Text style={styles.priceDiscount}>-€{discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>€{getTotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Bottom Spacing - Extra padding to prevent overlap with checkout footer and bottom tabs */}
        <View style={{ height: Math.max(160, insets.bottom + 150) }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={[styles.checkoutFooter, { bottom: Math.max(64, insets.bottom + 64) }]}>
        <View style={styles.checkoutFooterLeft}>
          <Text style={styles.checkoutItemCount}>
            {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
          </Text>
          <Text style={styles.checkoutTotal}>€{getTotal().toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
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
        >
          <Text style={styles.checkoutButtonText}>{t('checkout')}</Text>
          <Text style={styles.checkoutButtonIcon}>→</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  clearAllText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  restaurantSection: {
    backgroundColor: colors.surface,
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
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  metaDot: {
    fontSize: fontSize.sm,
    color: colors.text.light,
    marginHorizontal: spacing.xs,
  },
  cartSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  quantityText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
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
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addMoreIcon: {
    fontSize: fontSize.xl,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  addMoreText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  promoSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  promoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  applyButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
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
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  instructionsInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceSection: {
    backgroundColor: colors.surface,
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
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  priceFree: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.success,
  },
  priceDiscount: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  checkoutFooter: {
    position: 'absolute',
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
  checkoutFooterLeft: {
    flex: 1,
  },
  checkoutItemCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.white,
    opacity: 0.9,
  },
  checkoutTotal: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  checkoutButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  checkoutButtonIcon: {
    fontSize: fontSize.lg,
    color: colors.primary,
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
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyCartText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  browseButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
});

export default CartScreen;
