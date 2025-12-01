import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import formatCurrency from '../utils/currency';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CartList({ navigation }) {
  const { cartsArray, getVendorSubtotal, clearVendorCartAndSync } = useCart();
  const { colors } = useTheme();

  if (!cartsArray || cartsArray.length === 0) {
    return null;
  }

  const confirmDeleteVendorCart = (vendorId) => {
    if (!vendorId) return;
    Alert.alert(
      'Delete cart',
      'Are you sure you want to remove all items from this cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await clearVendorCartAndSync(vendorId);
            if (!res.success) {
              console.warn(res.error || 'Failed to delete cart');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ padding: spacing.md }}>
      {cartsArray.map((cart) => {
        const itemCount = Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id].quantity || 0), 0);
        const subtotal = getVendorSubtotal(cart.vendorId);
        const dishCount = Object.keys(cart.items || {}).length;

        // try to get vendor image and info from first product
        const firstItem = cart.items && Object.keys(cart.items).length ? cart.items[Object.keys(cart.items)[0]].product : null;
        const vendorImage = firstItem?._raw?.vendor?.storePhoto || firstItem?.image || null;
        const vendorRating = firstItem?._raw?.vendor?.rating || '4.5';
        const vendorDeliveryTime = firstItem?._raw?.vendor?.deliveryTime || '30-40 min';

        return (
          <View key={cart.vendorId}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
              activeOpacity={0.7}
              style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  {vendorImage ? (
                    <Image source={{ uri: vendorImage }} style={styles.vendorImage} />
                  ) : (
                    <View style={[styles.vendorImage, { backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="restaurant" size={32} color={colors.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>
                        {cart.vendorName || 'Vendor'}
                      </Text>
                      {itemCount > 0 && (
                        <View style={[styles.itemBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.itemBadgeText}>{itemCount}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="star" size={14} color="#FFA000" />
                        <Text style={[styles.metaText, { color: colors.text.secondary }]}> {vendorRating}</Text>
                      </View>
                      <Text style={[styles.metaDot, { color: colors.text.light }]}>•</Text>
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="bike-fast" size={14} color={colors.text.secondary} />
                        <Text style={[styles.metaText, { color: colors.text.secondary }]}> {vendorDeliveryTime}</Text>
                      </View>
                    </View>

                    <View style={styles.dishRow}>
                      <Ionicons name="fast-food" size={14} color={colors.primary} />
                      <Text style={[styles.dishInfo, { color: colors.text.secondary }]}>
                        {' '}{dishCount} {dishCount === 1 ? 'dish' : 'dishes'} • {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </View>

                  {/* Three dots menu trigger */}
                  <TouchableOpacity
                    onPress={() => confirmDeleteVendorCart(cart.vendorId)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ paddingLeft: spacing.sm, paddingVertical: spacing.xs }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.totalLabel, { color: colors.text.secondary }]}>Total Amount</Text>
                  <Text style={[styles.subtotal, { color: colors.primary }]}>
                    {formatCurrency(firstItem?.currency || '', subtotal)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.viewCartButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
                >
                  <Text style={styles.viewCartText}>View Cart</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  vendorCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vendorImage: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vendorName: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    flex: 1,
    marginRight: spacing.sm,
  },
  itemBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  itemBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  metaDot: {
    marginHorizontal: spacing.sm,
    fontSize: 13,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dishInfo: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  subtotal: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  viewCartText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
});
