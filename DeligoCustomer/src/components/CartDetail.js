import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Image, Platform } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';

export default function CartDetail({ vendorId, navigation }) {
  const { getVendorCart, getVendorSubtotal, updateQuantity, removeItem, applyPromoCodeToVendor, removeAppliedPromoFromVendor, setDeliveryInstructionsForVendor } = useCart();
  const cart = getVendorCart(vendorId);
  const { colors } = useTheme();
  const [promoInput, setPromoInput] = useState('');

  if (!cart) return <Text style={{ color: colors.text.secondary, padding: spacing.md }}>No cart found.</Text>;

  const items = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));
  const subtotal = getVendorSubtotal(vendorId);
  const serviceFee = 1.99;
  const deliveryFee = (cart.vendorMeta && Number(cart.vendorMeta.deliveryFee)) || Number(cart._raw?.vendor?.deliveryFee ?? cart._raw?.vendor?.delivery_fee ?? 0) || 0;
  const discount = cart.appliedPromo?.discount || 0;
  const total = (Number(subtotal) + Number(serviceFee) + Number(deliveryFee) - Number(discount));

  const vendorImage = items.length ? (items[0].product._raw?.vendor?.storePhoto || items[0].product.image) : null;

  const onApplyPromo = () => {
    const res = applyPromoCodeToVendor(vendorId, promoInput);
    if (!res.ok) alert(res.message || 'Invalid promo');
    else setPromoInput('');
  };

  const onCheckout = () => {
    const cartData = {
      vendorId,
      vendorName: cart.vendorName,
      items,
      subtotal,
      serviceFee,
      deliveryFee,
      promoCode: cart.appliedPromo?.code,
      deliveryInstructions: cart.deliveryInstructions,
      total,
    };
    navigation.navigate('Checkout', { cartData });
  };

  // bottom bar height used to pad scroll area
  const footerHeight = 88 + (Platform.OS === 'ios' ? 24 : 0);

  return (
    <View style={{ flex: 1 }}>
      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ paddingBottom: footerHeight }} showsVerticalScrollIndicator={false}>
        {/* Vendor header */}
        <View style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {vendorImage ? (
            <Image source={{ uri: vendorImage }} style={styles.vendorImage} />
          ) : (
            <View style={[styles.vendorImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.text.secondary }}>🏬</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{cart.vendorName || 'Vendor'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: colors.text.secondary, fontSize: 13 }}>⭐ {cart._raw?.vendor?.rating ?? ''}</Text>
              <Text style={{ color: colors.text.light, marginHorizontal: 8 }}>•</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{cart._raw?.vendor?.deliveryTime || '30-40 min'}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
          {items.map(it => (
            <View key={it.id} style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {it.product.image ? (
                  <Image source={{ uri: it.product.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border }]}><Text>🍽</Text></View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={2}>{it.product.name}</Text>
                  <Text style={{ color: colors.text.secondary, marginTop: 6 }}>{it.product._raw?.description || ''}</Text>
                  <Text style={[styles.itemPrice, { color: colors.text.primary, marginTop: 6 }]}>{it.product.currency || '€'}{Number(it.product.price).toFixed(2)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.qtyPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={() => updateQuantity(it.id, -1, vendorId)} style={styles.qtyBtn}><Text style={{ color: colors.primary }}>−</Text></TouchableOpacity>
                    <Text style={{ marginHorizontal: spacing.sm, minWidth: 24, textAlign: 'center', color: colors.text.primary }}>{it.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(it.id, 1, vendorId)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>+</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(it.id, vendorId)} style={{ marginTop: 10 }}>
                    <Text style={{ color: '#D32F2F' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Promo & Delivery Instructions */}
        <View style={{ padding: spacing.md }}>
          <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginBottom: 8 }}>Have a promo code?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput value={promoInput} onChangeText={setPromoInput} placeholder="Enter promo code" placeholderTextColor={colors.text.light} style={[styles.promoInput, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.surface }]} autoCapitalize="characters" />
            <TouchableOpacity onPress={onApplyPromo} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold' }}>Apply</Text>
            </TouchableOpacity>
          </View>

          {cart.appliedPromo ? (
            <View style={{ marginTop: 10, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text.primary }}>{cart.appliedPromo.code} • -€{cart.appliedPromo.discount.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => removeAppliedPromoFromVendor(vendorId)}><Text style={{ color: '#D32F2F' }}>Remove</Text></TouchableOpacity>
            </View>
          ) : null}

          <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginTop: spacing.md }}>Delivery instructions</Text>
          <TextInput value={cart.deliveryInstructions || ''} onChangeText={(t) => setDeliveryInstructionsForVendor(vendorId, t)} style={[styles.instructionsInput, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.surface }]} multiline numberOfLines={3} />
        </View>

        {/* Price Breakdown */}
        <View style={{ padding: spacing.md }}>
          <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginBottom: 10 }}>Order summary</Text>
          <View style={styles.rowBetween}><Text style={{ color: colors.text.secondary }}>Subtotal</Text><Text style={{ color: colors.text.primary }}>{items[0]?.product.currency || '€'}{Number(subtotal).toFixed(2)}</Text></View>
          <View style={styles.rowBetween}><Text style={{ color: colors.text.secondary }}>Delivery fee</Text><Text style={{ color: colors.text.primary }}>{deliveryFee === 0 ? 'Free' : `${items[0]?.product.currency || '€'}${Number(deliveryFee).toFixed(2)}`}</Text></View>
          <View style={styles.rowBetween}><Text style={{ color: colors.text.secondary }}>Service fee</Text><Text style={{ color: colors.text.primary }}>{items[0]?.product.currency || '€'}{Number(serviceFee).toFixed(2)}</Text></View>
          {discount > 0 && <View style={styles.rowBetween}><Text style={{ color: colors.text.secondary }}>Discount</Text><Text style={{ color: colors.success || '#4CAF50' }}>-€{Number(discount).toFixed(2)}</Text></View>}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
          <View style={styles.rowBetween}><Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold' }}>Total</Text><Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold' }}>{items[0]?.product.currency || '€'}{Number(total).toFixed(2)}</Text></View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{items.reduce((s, it) => s + it.quantity, 0)} items</Text>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: 18 }}>{items[0]?.product.currency || '€'}{Number(total).toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={onCheckout}>
          <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  vendorImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  vendorName: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemImage: {
    width: 80,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  itemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  qtyPill: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  promoInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
  },
  applyBtn: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
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
    marginTop: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.xl,
  }
});
