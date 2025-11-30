import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';

export default function CartList({ navigation }) {
  const { cartsArray, getVendorSubtotal } = useCart();
  const { colors } = useTheme();

  if (!cartsArray || cartsArray.length === 0) {
    return (
      <View style={{ padding: spacing.md }}>
        <Text style={{ color: colors.text.secondary }}>Your cart is empty.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: spacing.md }}>
      {cartsArray.map((cart) => {
        const itemCount = Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id].quantity || 0), 0);
        const subtotal = getVendorSubtotal(cart.vendorId);
        // try to get vendor image from first product
        const firstItem = cart.items && Object.keys(cart.items).length ? cart.items[Object.keys(cart.items)[0]].product : null;
        const vendorImage = firstItem?._raw?.vendor?.storePhoto || firstItem?.product?._raw?.vendor?.storePhoto || null;

        return (
          <TouchableOpacity key={cart.vendorId} onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })} activeOpacity={0.9} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              {vendorImage ? (
                <Image source={{ uri: vendorImage }} style={styles.vendorImage} />
              ) : (
                <View style={[styles.vendorImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.text.secondary }}>🏬</Text>
                </View>
              )}

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{cart.vendorName || 'Vendor'}</Text>
                <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{itemCount} items • approx 30-40 min</Text>
                <Text style={{ color: colors.text.secondary, marginTop: 2, fontSize: fontSize.sm }}>{cart.items && Object.keys(cart.items).length ? `${Object.keys(cart.items).length} dishes` : ''}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.subtotal, { color: colors.primary }]}>{firstItem?.currency || '€'}{Number(subtotal).toFixed(2)}</Text>
                <View style={[styles.viewButton, { backgroundColor: colors.primary, marginTop: spacing.xs }]}>
                  <Text style={{ color: '#fff' }}>See your cart</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  vendorName: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
  subtotal: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.xs,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
});
