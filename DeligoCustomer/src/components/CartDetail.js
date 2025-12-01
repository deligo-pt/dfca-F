import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Image, Platform, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import formatCurrency from '../utils/currency';
import { Ionicons } from '@expo/vector-icons';

export default function CartDetail({ vendorId, navigation }) {
  const { getVendorCart, getVendorSubtotal, updateQuantity, removeItem, applyPromoCodeToVendor, removeAppliedPromoFromVendor, setDeliveryInstructionsForVendor, syncing } = useCart();
  const cart = getVendorCart(vendorId);
  const { colors } = useTheme();
  const [promoInput, setPromoInput] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  if (!cart) return <Text style={{ color: colors.text.secondary, padding: spacing.md }}>No cart found.</Text>;

  const items = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));
  const subtotal = getVendorSubtotal(vendorId);
  const serviceFee = 1.99;
  const deliveryFee = (cart.vendorMeta && Number(cart.vendorMeta.deliveryFee)) || Number(cart._raw?.vendor?.deliveryFee ?? cart._raw?.vendor?.delivery_fee ?? 0) || 2.99;
  const discount = cart.appliedPromo?.discount || 0;
  const total = (Number(subtotal) + Number(serviceFee) + Number(deliveryFee) - Number(discount));

  const vendorImage = items.length ? (items[0].product._raw?.vendor?.storePhoto || items[0].product.image) : null;
  const vendorRating = items.length ? (items[0].product._raw?.vendor?.rating || '4.5') : '4.5';
  const vendorDeliveryTime = items.length ? (items[0].product._raw?.vendor?.deliveryTime || '30-40 min') : '30-40 min';

  const onApplyPromo = () => {
    const res = applyPromoCodeToVendor(vendorId, promoInput);
    if (!res.ok) alert(res.message || 'Invalid promo');
    else {
      setPromoInput('');
      setShowPromoInput(false);
    }
  };

  const handleUpdateQuantity = async (itemId, delta) => {
    setUpdatingItemId(itemId);
    await updateQuantity(itemId, delta, vendorId);
    setTimeout(() => setUpdatingItemId(null), 300);
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ paddingBottom: footerHeight }} showsVerticalScrollIndicator={false}>
        {/* Vendor header card */}
        <View style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {vendorImage ? (
            <Image source={{ uri: vendorImage }} style={styles.vendorImage} />
          ) : (
            <View style={[styles.vendorImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="restaurant" size={32} color={colors.text.secondary} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{cart.vendorName || 'Vendor'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="star" size={14} color="#FFA000" />
              <Text style={{ color: colors.text.secondary, fontSize: 13, marginLeft: 4 }}>{vendorRating}</Text>
              <Text style={{ color: colors.text.light, marginHorizontal: 8 }}>•</Text>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={{ color: colors.text.secondary, fontSize: 13, marginLeft: 4 }}>{vendorDeliveryTime}</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Ionicons name="fast-food" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Your Order</Text>
        </View>

        {/* Items */}
        <View style={{ paddingHorizontal: spacing.md }}>
          {items.map((it) => (
            <View key={it.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row' }}>
                {it.product.image ? (
                  <Image source={{ uri: it.product.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border }]}>
                    <Text style={{ fontSize: 24 }}>🍽</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={2}>{it.product.name}</Text>
                  {it.product._raw?.description && (
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{it.product._raw.description}</Text>
                  )}
                  <Text style={[styles.itemPrice, { color: colors.text.primary, marginTop: 6 }]}>{formatCurrency(it.product.currency || '', it.product.price)}</Text>
                </View>
              </View>

              <View style={styles.itemActions}>
                <View style={[styles.qtyPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, -1)}
                    style={[styles.qtyBtn, { backgroundColor: colors.background }]}
                    disabled={updatingItemId === it.id || it.quantity <= 1}
                  >
                    {updatingItemId === it.id && it.quantity > 1 ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="remove" size={18} color={it.quantity <= 1 ? colors.text.light : colors.primary} />
                    )}
                  </TouchableOpacity>
                  <Text style={{
                    marginHorizontal: spacing.md,
                    minWidth: 28,
                    textAlign: 'center',
                    color: colors.text.primary,
                    fontFamily: 'Poppins-SemiBold',
                    fontSize: fontSize.md
                  }}>
                    {it.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, 1)}
                    style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                    disabled={updatingItemId === it.id}
                  >
                    {updatingItemId === it.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="add" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(it.id, vendorId)} style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                    <Text style={{ color: '#D32F2F', marginLeft: 4, fontSize: 13, fontFamily: 'Poppins-Medium' }}>Remove</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Promo Section */}
        <View style={{ padding: spacing.md }}>
          <TouchableOpacity
            onPress={() => setShowPromoInput(!showPromoInput)}
            style={[styles.promoToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="pricetag" size={20} color={colors.primary} />
              <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginLeft: spacing.sm }}>Have a promo code?</Text>
            </View>
            <Ionicons name={showPromoInput ? "chevron-up" : "chevron-down"} size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          {showPromoInput && (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={promoInput}
                  onChangeText={setPromoInput}
                  placeholder="Enter promo code"
                  placeholderTextColor={colors.text.light}
                  style={[styles.promoInput, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.surface }]}
                  autoCapitalize="characters"
                />
                <TouchableOpacity onPress={onApplyPromo} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold' }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {cart.appliedPromo && (
            <View style={[styles.appliedPromo, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginLeft: spacing.sm }}>
                  {cart.appliedPromo.code} • -{formatCurrency(items[0]?.product.currency || '', cart.appliedPromo.discount)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeAppliedPromoFromVendor(vendorId)}>
                <Ionicons name="close-circle" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delivery Instructions */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginLeft: spacing.sm }}>Delivery instructions</Text>
          </View>
          <TextInput
            value={cart.deliveryInstructions || ''}
            onChangeText={(t) => setDeliveryInstructionsForVendor(vendorId, t)}
            placeholder="e.g., Leave at door, Ring bell twice..."
            placeholderTextColor={colors.text.light}
            style={[styles.instructionsInput, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.surface }]}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.lg, marginLeft: spacing.sm }}>Order Summary</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>Subtotal</Text>
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>{formatCurrency(items[0]?.product.currency || '', subtotal)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>Delivery fee</Text>
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>{deliveryFee === 0 ? 'Free' : formatCurrency(items[0]?.product.currency || '', deliveryFee)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>Service fee</Text>
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>{formatCurrency(items[0]?.product.currency || '', serviceFee)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>🎟️ Discount</Text>
              <Text style={{ color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>-{formatCurrency(items[0]?.product.currency || '', discount)}</Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.lg }}>Total</Text>
            <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.xl }}>{formatCurrency(items[0]?.product.currency || '', total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{items.reduce((s, it) => s + it.quantity, 0)} items</Text>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: 20 }}>{formatCurrency(items[0]?.product.currency || '', total)}</Text>
        </View>
        <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={onCheckout}>
          <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: spacing.xs }} />
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
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  vendorImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
  },
  vendorName: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: spacing.sm,
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemImage: {
    width: 88,
    height: 64,
    borderRadius: borderRadius.md,
  },
  itemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  qtyPill: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
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
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  appliedPromo: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  summaryCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  }
});

