import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';

export default function CartDetail({ vendorId, navigation }) {
  const { getVendorCart, getVendorSubtotal, updateQuantity, removeItem, applyPromoCodeToVendor, removeAppliedPromoFromVendor, setDeliveryInstructionsForVendor } = useCart();
  const cart = getVendorCart(vendorId);
  const { colors } = useTheme();

  if (!cart) return <Text style={{ color: colors.text.secondary, padding: spacing.md }}>No cart found.</Text>;

  const items = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));
  const subtotal = getVendorSubtotal(vendorId);

  const onCheckout = () => {
    const cartData = {
      vendorId,
      vendorName: cart.vendorName,
      items,
      subtotal,
      serviceFee: 1.99,
      promoCode: cart.appliedPromo?.code,
      deliveryInstructions: cart.deliveryInstructions,
    };
    navigation.navigate('Checkout', { cartData });
  };

  return (
    <ScrollView style={{ padding: spacing.md }}>
      <Text style={{ fontSize: fontSize.xl, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{cart.vendorName || 'Vendor'}</Text>

      {items.map(it => (
        <View key={it.id} style={[styles.row, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text.primary }}>{it.product.name}</Text>
            <Text style={{ color: colors.text.secondary }}>{it.product._raw?.description || ''}</Text>
            <Text style={{ color: colors.primary }}>{it.product.currency || '€'}{Number(it.product.price).toFixed(2)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => updateQuantity(it.id, -1, vendorId)} style={styles.qBtn}><Text style={{ color: '#fff' }}>−</Text></TouchableOpacity>
              <Text style={{ marginHorizontal: spacing.sm }}>{it.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(it.id, 1, vendorId)} style={[styles.qBtn, { backgroundColor: '#4CAF50' }]}><Text style={{ color: '#fff' }}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => removeItem(it.id, vendorId)} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: '#D32F2F' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Promo */}
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold' }}>Promo code</Text>
        {cart.appliedPromo ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
            <Text style={{ color: colors.text.primary }}>{cart.appliedPromo.code} • -€{cart.appliedPromo.discount.toFixed(2)}</Text>
            <TouchableOpacity onPress={() => removeAppliedPromoFromVendor(vendorId)}><Text style={{ color: '#D32F2F' }}>Remove</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => applyPromoCodeToVendor(vendorId, 'SAVE5')} style={{ marginTop: spacing.sm, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: borderRadius.md }}>
            <Text style={{ color: '#fff' }}>Apply demo SAVE5</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delivery instructions */}
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold' }}>Delivery instructions</Text>
        <TextInput value={cart.deliveryInstructions || ''} onChangeText={(t) => setDeliveryInstructionsForVendor(vendorId, t)} style={{ borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginTop: spacing.sm, borderRadius: borderRadius.md }} multiline numberOfLines={3} />
      </View>

      {/* Summary */}
      <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
        <Text style={{ color: colors.text.secondary }}>Subtotal: {cart.items && Object.keys(cart.items).length ? (cart.items[Object.keys(cart.items)[0]].product.currency || '€') : '€'}{Number(subtotal).toFixed(2)}</Text>
        <Text style={{ color: colors.text.secondary }}>Service fee: €1.99</Text>
        <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', marginTop: spacing.sm }}>Total: €{(Number(subtotal) + 1.99 - (cart.appliedPromo?.discount || 0)).toFixed(2)}</Text>
      </View>

      <TouchableOpacity onPress={onCheckout} style={{ marginTop: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold' }}>Checkout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  qBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
