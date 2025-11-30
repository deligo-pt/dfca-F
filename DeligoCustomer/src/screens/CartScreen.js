import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useCart } from '../contexts/CartContext';
import CartList from '../components/CartList';

const CartScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Use Cart context for real data (cartsArray provides multiple vendor carts)
  const { cartsArray, clearCart } = useCart();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[ 'top' ]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart')}</Text>
        <TouchableOpacity onPress={() => clearCart()}>
          <Text style={[styles.clearAllText, { color: colors.primary }]}>{t('clearAll')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        <CartList navigation={navigation} />
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
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
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
    color: '#4CAF50',
  },
  appliedPromoDiscount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: '#4CAF50',
  },
  removePromoText: {
    fontSize: fontSize.lg,
    color: '#4CAF50',
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
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    shadowRadius: 8,
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
