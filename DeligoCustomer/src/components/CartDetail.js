import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Image, Platform, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import formatCurrency from '../utils/currency';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CheckoutAPI from '../utils/checkoutApi';

export default function CartDetail({ vendorId, navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { getVendorCart, updateQuantity, removeItem, setDeliveryInstructionsForVendor } = useCart();
  const { products } = useProducts();
  const cart = getVendorCart(vendorId);
  const { colors, isDarkMode } = useTheme();
  const [updatingItem, setUpdatingItem] = useState(null); // { id, action: 'add' | 'remove' }
  const [checkingOut, setCheckingOut] = useState(false);

  if (!cart) return <Text style={{ color: colors.text.secondary, padding: spacing.md }}>{t('noCartFound')}</Text>;

  const rawItems = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));

  // Build detailed pricing per item from product.pricing AND enrich with ProductsContext
  const items = rawItems.map(it => {
    // 1. Existing cart product data
    let p = it.product || {};

    // 2. Lookup in ProductsContext for better data (images, names, pricing)
    let contextProduct = null;
    if (products && products.length > 0) {
      const rawId = p.id || p._id || p.productId || it.productId || it.id; // it.id might be cart item key, checking all
      if (rawId) {
        contextProduct = products.find(prod =>
          prod.id === rawId ||
          prod._id === rawId ||
          prod._raw?._id === rawId ||
          prod._raw?.productId === rawId ||
          prod._raw?.id === rawId ||
          (prod._raw && (prod._raw.productId === rawId || prod._raw.id === rawId))
        );
      }

      // Debug: Log lookup result
      if (!contextProduct && rawId) {
        console.debug('[CartDetail] Product lookup failed for ID:', rawId, 'Available products:', products.length);
      } else if (contextProduct) {
        console.debug('[CartDetail] Product matched:', contextProduct.name, 'for ID:', rawId);
      }
    }

    // Merge: Prefer Context data for static fields (image, name) AND pricing if cart data is incomplete
    if (contextProduct) {
      p = {
        ...p,
        image: contextProduct.image || p.image,
        name: contextProduct.name || p.name,
        _raw: {
          ...(contextProduct._raw || {}),
          ...(p._raw || {}),
          // Merge pricing: use context pricing if cart pricing is missing
          pricing: {
            ...(contextProduct._raw?.pricing || {}),
            ...(p._raw?.pricing || {}),
            ...(p.pricing || {})
          }
        }
      };

      console.debug('[CartDetail] Merged product data:', {
        name: p.name,
        hasImage: !!p.image,
        hasPricing: !!(p._raw?.pricing || p.pricing),
        pricing: p._raw?.pricing || p.pricing
      });
    }

    const pricing = p?._raw?.pricing || p?.pricing || {};
    const basePrice = Number(pricing.price ?? p.price ?? 0) || 0;
    const discountRaw = pricing.discount;
    const taxRaw = pricing.tax;
    const discountPercent = (discountRaw != null && !isNaN(Number(discountRaw))) ? (Number(discountRaw) <= 1 ? Number(discountRaw) * 100 : Number(discountRaw)) : 0;
    const taxPercent = (taxRaw != null && !isNaN(Number(taxRaw))) ? (Number(taxRaw) <= 1 ? Number(taxRaw) * 100 : Number(taxRaw)) : 0;
    const discountUnit = basePrice * (discountPercent / 100);
    const afterDiscount = basePrice - discountUnit;
    const taxUnit = afterDiscount * (taxPercent / 100);
    const finalUnitFromPricing = pricing.finalPrice != null ? Number(pricing.finalPrice) : null;
    const finalUnit = Number.isFinite(finalUnitFromPricing) ? finalUnitFromPricing : (afterDiscount + taxUnit);
    return {
      ...it,
      product: p,
      qty: it.quantity || 0,
      currency: pricing.currency || p.currency || '',
      basePrice,
      discountPercent,
      discountUnit,
      afterDiscount,
      taxPercent,
      taxUnit,
      finalUnit,
      // Preserve backend subtotal for accurate total calculation
      backendSubtotal: it.subtotal ?? it.totalBeforeTax ?? null,
      // Include addons for display
      addons: it.addons || [],
    };
  });

  // Debug: Log total calculation
  if (items.length > 0) {
    console.debug('[CartDetail] Total calculation:', items.map(it => ({
      name: it.product?.name,
      backendSubtotal: it.backendSubtotal,
      fallback: it.finalUnit * it.qty,
      addons: it.addons?.length || 0
    })));
  }

  const currency = items[0]?.currency || '';
  const baseSubtotal = items.reduce((s, it) => s + it.basePrice * it.qty, 0);
  const discountTotal = items.reduce((s, it) => s + it.discountUnit * it.qty, 0);
  const subtotalAfterDiscount = baseSubtotal - discountTotal;
  const taxTotal = items.reduce((s, it) => s + it.taxUnit * it.qty, 0);

  // Use backend subtotal if available (includes addons), otherwise fallback to local calculation
  const total = items.reduce((s, it) => {
    if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) {
      return s + Number(it.backendSubtotal);
    }
    return s + it.finalUnit * it.qty;
  }, 0);

  // Resolve Vendor Details (Context > Cart > Item)
  // Try to find vendor info from the first item since they belong to the same vendor
  const firstItem = items.length > 0 ? items[0] : null;

  // Look up vendor in ProductsContext (via first item)
  let pcVendor = null;
  if (products && products.length > 0 && firstItem) {
    const pId = firstItem.product.id || firstItem.product._id;
    const match = products.find(p => p.id === pId || p._id === pId);
    if (match) {
      pcVendor = match.vendor || match._raw?.vendor;
    }
  }

  // Fallback: If no vendor found yet, try searching products by vendorId
  if (!pcVendor && products && products.length > 0 && vendorId) {
    const match = products.find(p => {
      const v = p.vendor || {};
      const r = p._raw || {};
      const rv = r.vendor || {};
      const vid = String(vendorId);
      return String(v.vendorId) === vid ||
        String(v.id) === vid ||
        String(v._id) === vid ||
        String(r.vendorId) === vid ||
        String(rv.vendorId) === vid ||
        String(rv._id) === vid;
    });
    if (match) {
      pcVendor = match.vendor || match._raw?.vendor;
    }
  }

  const finalVendorName = (pcVendor?.vendorName || pcVendor?.name) || (products && products.find(p => p.vendor?.vendorId === vendorId)?.name) || (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) || firstItem?.product?._raw?.vendor?.vendorName || t('vendor');
  const finalVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image || cart.vendorImage || firstItem?.product?.image || null; // Fallback to product image if logo missing
  const finalVendorRating = cart.vendorRating || pcVendor?.rating || firstItem?.product?._raw?.vendor?.rating || '4.5';
  const finalDeliveryTime = cart.vendorDeliveryTime || pcVendor?.deliveryTime || firstItem?.product?._raw?.vendor?.deliveryTime || '30-40 min';


  const vendorImage = finalVendorImage;
  const vendorRating = finalVendorRating;
  const vendorDeliveryTime = finalDeliveryTime;

  const handleUpdateQuantity = async (itemId, delta) => {
    const action = delta > 0 ? 'add' : 'remove';
    console.log('[CartDetail] handleUpdateQuantity called:', { itemId, delta, vendorId, action });
    setUpdatingItem({ id: itemId, action });
    try {
      console.log('[CartDetail] Calling updateQuantity...');
      await updateQuantity(itemId, delta, vendorId);
      console.log('[CartDetail] updateQuantity completed successfully');
    } catch (err) {
      console.error("[CartDetail] Failed to update quantity", err);
    } finally {
      setUpdatingItem(null);
    }
  };

  const onCheckout = async () => {
    if (checkingOut) return;
    setCheckingOut(true);

    try {
      // Optimistic navigation: pass data directly
      // CheckoutScreen will handle the session creation
      const cartData = {
        vendorId,
        vendorName: cart.vendorName,
        items: items.map(it => ({
          id: it.id,
          name: it.product?.name,
          quantity: it.qty,
          price: it.basePrice,
          discountPercent: it.discountPercent,
          taxPercent: it.taxPercent,
          finalPrice: it.finalUnit,
          currency: it.currency,
        })),
        subtotal: subtotalAfterDiscount,
        tax: taxTotal,
        total,
        useCart: true,
      };

      navigation.navigate('Checkout', { cartData });
    } catch (e) {
      console.error('[CartDetail] Navigation error', e);
    } finally {
      setTimeout(() => setCheckingOut(false), 1000);
    }
  };

  // bottom bar height used to pad scroll area
  const footerHeight = 88 + insets.bottom;

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
            <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{finalVendorName || t('vendor')}</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('yourOrder')}</Text>
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

                  {/* Selected Variation */}
                  {it.selectedVariation && (
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2, fontFamily: 'Poppins-Regular' }}>
                      {t('variant') || 'Variant'}: <Text style={{ fontFamily: 'Poppins-SemiBold' }}>{it.selectedVariation}</Text>
                    </Text>
                  )}

                  {/* Options (e.g. choice selections) */}
                  {it.options && Object.keys(it.options).length > 0 && (
                    <View style={{ marginTop: 2 }}>
                      {Object.entries(it.options).map(([key, value]) => (
                        <Text key={key} style={{ color: colors.text.secondary, fontSize: 12, fontFamily: 'Poppins-Regular' }}>
                          {key}: <Text style={{ fontFamily: 'Poppins-SemiBold' }}>{value}</Text>
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Addons */}
                  {it.addons && it.addons.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      {it.addons.map((addon, idx) => (
                        <Text key={idx} style={{ color: colors.text.secondary, fontSize: 12, fontFamily: 'Poppins-Regular' }}>
                          + {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                          {addon.price > 0 && ` (${formatCurrency(it.currency, addon.price)})`}
                        </Text>
                      ))}
                    </View>
                  )}
                  {/* Pricing breakdown - CLEANER UI */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: colors.text.primary }}>
                      {formatCurrency(it.currency, it.finalUnit)}
                    </Text>
                    {it.discountPercent > 0 && (
                      <>
                        <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 12, color: colors.text.light, textDecorationLine: 'line-through', marginLeft: 6 }}>
                          {formatCurrency(it.currency, it.basePrice)}
                        </Text>
                        <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                          <Text style={{ color: '#2E7D32', fontSize: 10, fontFamily: 'Poppins-Bold' }}>
                            -{Math.round(it.discountPercent)}%
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.itemActions}>
                {/* Quantity Control Pill */}
                <View style={[styles.qtyPill, { backgroundColor: isDarkMode ? colors.surfaceVariant || colors.border : '#F0F0F0' }]}>
                  {/* Decrement Button */}
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, -1)}
                    style={styles.qtyBtn}
                    disabled={updatingItem?.id === it.id || it.qty <= 0}
                  >
                    {updatingItem?.id === it.id && updatingItem?.action === 'remove' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={it.qty <= 1 ? "trash-outline" : "remove"} // Show trash if qty is 1, else remove
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Count */}
                  <Text style={[styles.qtyText, { color: colors.text.primary }]}>
                    {it.qty}
                  </Text>

                  {/* Increment Button */}
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, 1)}
                    style={styles.qtyBtn}
                    disabled={updatingItem?.id === it.id}
                  >
                    {updatingItem?.id === it.id && updatingItem?.action === 'add' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="add" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Total Price & Remove Link */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: 16 }}>
                    {(() => {
                      // Calculate total per unit including addons
                      const addonTotalPerUnit = (it.addons || []).reduce((sum, addon) => {
                        const price = Number(addon.price || 0);
                        const qty = Number(addon.quantity || 1);
                        return sum + (price * qty);
                      }, 0);

                      // Total = (Base Discounted + Addons) * Qty
                      // But wait! Addons are usually per item.
                      // If it.addons array has `quantity`, it might be total quantity for that addon within the single product configuration? 
                      // Actually, based on screenshot: Addon "Extra Garlic Dip", Price 1.00. 
                      // If I order 2 Calamari, I pay 1.00 per Calamari for the dip?
                      // Usually yes. So the line item total should be (Unit + Addons) * Qty.

                      // Let's rely on backendSubtotal logic if available, but PER ITEM is tricky if backend gives total subtotal.
                      // If we have backendSubtotal (19.60), and qty is 2. Item total displayed should be 19.60.

                      if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) {
                        return formatCurrency(it.currency, it.backendSubtotal);
                      }

                      // Fallback calculation
                      const unitTotal = it.finalUnit * it.qty;
                      // Addons are flat cost per line item (not multiplied by qty)
                      const lineTotal = unitTotal + addonTotalPerUnit;
                      return formatCurrency(it.currency, lineTotal);
                    })()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Instructions */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginLeft: spacing.sm }}>{t('deliveryInstructions')}</Text>
          </View>
          <TextInput
            value={cart.deliveryInstructions || ''}
            onChangeText={(t) => setDeliveryInstructionsForVendor(vendorId, t)}
            placeholder={t('deliveryInstructionsPlaceholder')}
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
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.lg, marginLeft: spacing.sm }}>{t('orderSummary')}</Text>
          </View>

          {(() => {
            // Recalculate summary details locally to be consistent
            const itemsTotalBase = items.reduce((sum, it) => sum + (it.basePrice * it.qty), 0);
            const itemsDiscount = items.reduce((sum, it) => sum + (it.discountUnit * it.qty), 0);

            // Addons are apparently treated as flat total per line item by backend (based on 19.60 total vs 24.80 calculation)
            // So we sum up the addon prices directly, NOT multiplied by item quantity
            const itemsAddons = items.reduce((sum, it) => {
              const addonsCost = (it.addons || []).reduce((aSum, a) => aSum + (Number(a.price || 0) * Number(a.quantity || 1)), 0);
              return sum + addonsCost;
            }, 0);

            const calculatedSubtotal = itemsTotalBase + itemsAddons;

            // If backend provides a total, we should ideally use that for the final line
            // But for the breakdown, our local calc is safer for "Subtotal" vs "Discount" visual logic

            return (
              <>
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('itemsTotal') || 'Items Total'}</Text>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                    {formatCurrency(currency, itemsTotalBase)}
                  </Text>
                </View>

                {itemsAddons > 0 && (
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('addons') || 'Add-ons'}</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      {formatCurrency(currency, itemsAddons)}
                    </Text>
                  </View>
                )}

                {itemsDiscount > 0 && (
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('discount')}</Text>
                    <Text style={{ color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      -{formatCurrency(currency, itemsDiscount)}
                    </Text>
                  </View>
                )}

                {/* Provide visual assurance if taxes are included */}
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('tax')}</Text>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                    {taxTotal > 0 ? formatCurrency(currency, taxTotal) : formatCurrency(currency, 0)}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.lg }}>{t('total')}</Text>
                  <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.xl }}>
                    {formatCurrency(currency, total)}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingBottom: spacing.md + insets.bottom
      }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{items.reduce((s, it) => s + it.qty, 0)} {t('items')}</Text>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: 20 }}>{formatCurrency(currency, total)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: checkingOut ? 0.7 : 1 }]}
          onPress={onCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={{ color: colors.text.white || '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>{t('checkout')}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.white || '#fff'} style={{ marginLeft: spacing.xs }} />
            </>
          )}
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
    backgroundColor: '#f0f0f0',
  },
  itemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  qtyPill: {
    borderRadius: borderRadius.full,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
    // Glovo-style grey pill
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
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
