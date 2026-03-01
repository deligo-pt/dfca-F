import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Image, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useLocation } from '../contexts/LocationContext';
import formatCurrency from '../utils/currency';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CheckoutAPI from '../utils/checkoutApi';
import AlertModal from './AlertModal';

/**
 * CartDetail Component
 * 
 * Vendor-specific cart view managing line items and checkout initiation.
 * Features:
 * - Quantity adjustments and item removal.
 * - Delivery note input.
 * - Real-time price breakdown (Subtotal, Tax, Discounts).
 * - Context-aware product data synchronization.
 * 
 * @param {Object} props
 * @param {string} props.vendorId - Cart owner ID.
 * @param {Object} props.navigation - Navigation controller.
 */
export default function CartDetail({ vendorId, navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { getVendorCart, updateQuantity, removeItem, setDeliveryInstructionsForVendor, fetchCart } = useCart();
  const { products } = useProducts();
  const cart = getVendorCart(vendorId);
  const { colors, isDarkMode } = useTheme();
  const { currentLocation } = useLocation();
  const [updatingItem, setUpdatingItem] = useState(null); // Tracks the item currently being modified to show a spinner
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: []
  });

  if (!cart) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primary + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name="bag-outline" size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={{
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: colors.text.primary,
        marginBottom: 8,
        textAlign: 'center',
      }}>{t('cartEmpty') || 'Your cart is empty'}</Text>
      <Text style={{
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
      }}>{t('goAheadOrder') || 'Looks like you haven\'t added anything yet. Explore our menu and find something delicious!'}</Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 16,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
        onPress={() => navigation?.goBack()}
        activeOpacity={0.85}
      >
        <Ionicons name="restaurant-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Poppins-SemiBold' }}>{t('browseFood') || 'Browse Food'}</Text>
      </TouchableOpacity>
    </View>
  );

  const rawItems = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));

  // Enrich cart items with the latest product data from Context (images, names, price updates)
  const items = rawItems.map((it) => {
    // 1. Start with existing cart data
    let p = it.product || {};

    // 2. Attempt to resolve the latest product details from the global product list
    let contextProduct = null;
    if (products && products.length > 0) {
      const rawId = p.id || p._id || p.productId || it.productId || it.id;
      if (rawId) {
        contextProduct = products.find(
          (prod) =>
            prod.id === rawId ||
            prod._id === rawId ||
            prod._raw?._id === rawId ||
            prod._raw?.productId === rawId ||
            prod._raw?.id === rawId ||
            (prod._raw && (prod._raw.productId === rawId || prod._raw.id === rawId)),
        );
      }
    }

    // 3. Merge Strategies: Use Context data for static assets (image, name) but respect specific cart snapshots if needed.
    if (contextProduct) {
      p = {
        ...p,
        image: contextProduct.image || p.image,
        name: contextProduct.name || p.name,
        _raw: {
          ...(contextProduct._raw || {}),
          ...(p._raw || {}),
          pricing: {
            ...(contextProduct._raw?.pricing || {}),
            ...(p._raw?.pricing || {}),
            ...(p.pricing || {}),
          },
        },
      };
    }

    const pricing = p._raw?.pricing || p.pricing || {};
    const productPricing = it.productPricing || {};

    // Prioritize backend's explicit prices
    const basePrice = Number(it.price || productPricing.originalPrice || 0);
    const discountPercent = Number(it.discountPercent || it.productPricing?.discountRate || 0);
    const taxPercent = Number(it.taxPercent || productPricing.taxRate || 0);

    // Calculate line total from backend summary if available
    const itemGrandTotal = Number(it.itemSummary?.grandTotal || 0);
    const itemQty = Number(it.quantity || it.qty || 1);

    // The "unit price" shown should be the final price for ONE item (including tax/discount)
    const finalUnit = itemGrandTotal > 0 ? (itemGrandTotal / itemQty) : (it.finalUnit || 0);

    const discountUnit = (basePrice * discountPercent) / 100;
    const afterDiscount = basePrice - discountUnit;
    const taxUnit = (afterDiscount * taxPercent) / 100;

    return {
      ...it,
      product: p,
      qty: itemQty,
      currency: it.currency || pricing.currency || p.currency || '',
      basePrice,
      discountPercent,
      discountUnit,
      afterDiscount,
      taxPercent,
      taxUnit,
      finalUnit: finalUnit > 0 ? finalUnit : (afterDiscount + taxUnit),
      backendSubtotal: it.itemSummary?.grandTotal ?? it.subtotal ?? it.totalBeforeTax ?? null,
      addons: it.addons || [],
    };
  });

  const currency = items[0]?.currency || '';

  // Final Total calculation: Use backend subtotal logic if items match, otherwise fallback to local math
  const total = items.reduce((s, it) => {
    if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) {
      return s + Number(it.backendSubtotal);
    }
    return s + it.finalUnit * it.qty;
  }, 0);

  // Calculate generic totals for the summary view
  const baseSubtotal = items.reduce((s, it) => s + it.basePrice * it.qty, 0);
  const discountTotal = items.reduce((s, it) => s + it.discountUnit * it.qty, 0);
  const subtotalAfterDiscount = baseSubtotal - discountTotal;

  // Tax Calculation: Prefer backend taxAmount if available
  const taxTotal = items.reduce((s, it) => {
    if (it.taxAmount !== undefined && it.taxAmount !== null) {
      return s + Number(it.taxAmount);
    }
    return s + it.taxUnit * it.qty;
  }, 0);

  // Resolve Vendor Details (Context > Cart > Item fallback)
  const firstItem = items.length > 0 ? items[0] : null;
  let pcVendor = null;
  let pcProduct = null;

  // Try extracting vendor info from the first product's metadata
  if (products && products.length > 0 && firstItem) {
    const pId = firstItem.product.id || firstItem.product._id;
    const match = products.find(p => p.id === pId || p._id === pId);
    if (match) {
      pcProduct = match;
      pcVendor = match.vendor || match._raw?.vendor;
    }
  }

  // Backup: Search globally by vendorId if product link failed
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
      pcProduct = match; // technically this product belongs to the vendor so its delivery time *might* be relevant
      pcVendor = match.vendor || match._raw?.vendor;
    }
  }

  const extractRating = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val !== null) {
      if (val.average !== undefined) return extractRating(val.average);
      return null;
    }
    const num = Number(val);
    return !isNaN(num) ? num : null;
  };

  const finalVendorName = (pcVendor?.vendorName || pcVendor?.name) || (products && products.find(p => p.vendor?.vendorId === vendorId)?.name) || (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) || firstItem?.product?._raw?.vendor?.vendorName || t('vendor');
  const finalVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image || cart.vendorImage || firstItem?.product?.image || null;

  const ratingSources = [
    pcProduct?.rating,
    pcProduct?._raw?.rating,
    firstItem?.product?.productRating,
    firstItem?.product?.vendorRating,
    firstItem?.product?._raw?.rating,
    firstItem?.product?._raw?.vendorId?.rating,
    pcVendor?.rating,
    pcVendor?.businessDetails?.rating,
    firstItem?.product?._raw?.vendor?.rating,
    firstItem?.product?._raw?.businessDetails?.rating,
    firstItem?.product?._raw?.vendorId?.businessDetails?.rating,
    cart.vendorRating,
    cart.vendor?.rating,
  ];

  let finalVendorRating = null;
  for (const r of ratingSources) {
    const val = extractRating(r);
    if (val !== null && val > 0 && val <= 5) {
      finalVendorRating = Number(val).toFixed(1);
      break;
    }
  }

  const vendorLat = pcVendor?.latitude || firstItem?.product?._raw?.vendor?.latitude;
  const vendorLon = pcVendor?.longitude || firstItem?.product?._raw?.vendor?.longitude;

  let calculatedDeliveryTime = null;
  if (currentLocation?.latitude && currentLocation?.longitude && vendorLat && vendorLon) {
    const R = 6371; // Radius of the earth in km
    const dLat = (vendorLat - currentLocation.latitude) * (Math.PI / 180);
    const dLon = (vendorLon - currentLocation.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(currentLocation.latitude * (Math.PI / 180)) * Math.cos(vendorLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c;

    const baseTime = Math.max(10, Math.round(distKm * 3) + 10);
    calculatedDeliveryTime = `${baseTime} - ${baseTime + 5} min`;
  }

  const finalDeliveryTime = calculatedDeliveryTime || cart.vendorDeliveryTime || pcVendor?.deliveryTime || firstItem?.product?._raw?.vendor?.deliveryTime || pcProduct?.deliveryTime || '15 - 25 min';

  const handleUpdateQuantity = async (itemId, delta) => {
    // Local Stock Check
    if (delta > 0) {
      const item = items.find(it => it.id === itemId);
      if (item) {
        const stockQty = item.product?._raw?.stock?.quantity;
        // Check if stock is defined and valid number
        if (stockQty !== undefined && stockQty !== null) {
          const maxStock = parseInt(stockQty, 10);
          if (maxStock > 0 && (item.qty + delta) > maxStock) {
            setAlertConfig({
              title: t('maxComplete') || 'Max Quantity Reached',
              message: `${t('only') || 'Only'} ${maxStock} ${t('itemsAvailable') || 'items available'}.\n${t('cannotAddMore') || 'Cannot add more to cart.'}`,
              icon: 'alert-circle',
              buttons: [{ text: t('ok') || 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
            return;
          }
        }
      }
    }

    const action = delta > 0 ? 'add' : 'remove';
    setUpdatingItem({ id: itemId, action });
    try {
      // Check if this update will remove the item
      const item = items.find(it => it.id === itemId);
      if (item && item.qty + delta <= 0) {
        await removeItem(itemId, vendorId);
      } else {
        const res = await updateQuantity(itemId, delta, vendorId);
        if (res && !res.success) {
          let msg = res.error;
          // Clean up dirty backend messages if possible
          if (msg && msg.toString().includes('quantity')) {
            msg = `${t('cannotUpdateQty') || 'Cannot update quantity'}. ${t('stockLimitReached') || 'Stock limit might be reached.'}`;
          }
          setAlertConfig({
            title: t('error') || 'Error',
            message: msg || t('failedToUpdateCart') || 'Failed to update cart',
            icon: 'warning-outline',
            iconColor: colors.error || '#D32F2F',
            buttons: [{ text: t('ok') || 'OK', onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
        }
      }
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
      // Prepare checkout payload
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

  const footerHeight = 88 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: footerHeight }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchCart({ force: true });
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Vendor Header Card */}
        <View style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {finalVendorImage ? (
            <Image source={{ uri: finalVendorImage }} style={styles.vendorImage} />
          ) : (
            <View style={[styles.vendorImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="restaurant" size={32} color={colors.text.secondary} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{finalVendorName || t('vendor')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                <Ionicons name="star" size={12} color="#FFA000" />
                <Text style={{ color: finalVendorRating !== null ? colors.text.primary : '#FFA000', fontSize: 12, fontFamily: 'Poppins-Bold', marginLeft: 4 }}>
                  {finalVendorRating !== null ? finalVendorRating : (t('new') || 'New')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 4, fontFamily: 'Poppins-Regular' }}>
                  {finalDeliveryTime || 'Standard'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Ionicons name="fast-food" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('yourOrder')}</Text>
        </View>

        {/* Cart Items List */}
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

                  {/* Add-ons Display */}
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

                  {/* Price Tag */}
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
                {/* Quantity Controls */}
                <View style={[styles.qtyPill, { backgroundColor: isDarkMode ? colors.surfaceVariant || colors.border : '#F0F0F0' }]}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, -1)}
                    style={styles.qtyBtn}
                    disabled={updatingItem?.id === it.id || it.qty <= 0}
                  >
                    {updatingItem?.id === it.id && updatingItem?.action === 'remove' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={it.qty <= 1 ? "trash-outline" : "remove"}
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  <Text style={[styles.qtyText, { color: colors.text.primary }]}>
                    {it.qty}
                  </Text>

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

                {/* Line Item Total Calculation (including add-ons) */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: 16 }}>
                    {(() => {
                      // Calculate total per unit including addons costs
                      const addonTotalPerUnit = (it.addons || []).reduce((sum, addon) => {
                        const price = Number(addon.price || 0);
                        const qty = Number(addon.quantity || 1);
                        return sum + (price * qty);
                      }, 0);

                      if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) {
                        return formatCurrency(it.currency, it.backendSubtotal);
                      }

                      // Fallback: (Unit Price * Qty) + Addons (Addons are usually flat added price per unit)
                      const unitTotal = it.finalUnit * it.qty;
                      const lineTotal = unitTotal + addonTotalPerUnit; // Assuming addons are per-item cost already summed? Logic depends on cart structure
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

        {/* Order Summary & Totals */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.lg, marginLeft: spacing.sm }}>{t('orderSummary')}</Text>
          </View>

          {(() => {
            // Start with backend totals if available
            const totals = cart.totals || {};
            const hasBackendTotals = totals.grandTotal !== undefined;

            if (hasBackendTotals) {
              const itemsOriginal = totals.itemsOriginalTotal || 0;
              const discount = totals.discount || 0;
              const addons = totals.addonsTotal || 0;
              const subtotalNet = totals.totalPrice || 0; // Items Net + Addons
              // Use backend's total taxAmount for accuracy instead of locally calculated itemsTax
              const taxItems = totals.taxAmount || totals.itemsTax || 0;
              const taxAddons = totals.addonsTax || 0;
              const grandTotal = totals.grandTotal || 0;

              return (
                <>
                  {/* 1. Items Price (Original) */}
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('itemsPrice') || 'Items Price'}</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      {formatCurrency(currency, itemsOriginal)}
                    </Text>
                  </View>

                  {/* 2. Discount */}
                  {discount > 0 && (
                    <View style={styles.rowBetween}>
                      <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('discount')}</Text>
                      <Text style={{ color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                        -{formatCurrency(currency, discount)}
                      </Text>
                    </View>
                  )}

                  {/* 3. Add-ons Price */}
                  {addons > 0 && (
                    <View style={styles.rowBetween}>
                      <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('addons') || 'Add-ons'}</Text>
                      <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                        {formatCurrency(currency, addons)}
                      </Text>
                    </View>
                  )}

                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6, opacity: 0.5 }} />

                  {/* 4. Subtotal (Net/Excl Tax) */}
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.primary, fontSize: fontSize.md, fontFamily: 'Poppins-Medium' }}>{t('subtotalExclTax') || 'Subtotal (Excl. Tax)'}</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      {formatCurrency(currency, subtotalNet)}
                    </Text>
                  </View>

                  {/* 5 & 6. Taxes */}
                  {(taxItems > 0) && (
                    <View style={styles.rowBetween}>
                      <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('taxItems') || 'Tax (Items)'}</Text>
                      <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                        {formatCurrency(currency, taxItems)}
                      </Text>
                    </View>
                  )}
                  {(taxAddons > 0 || (addons > 0 && taxAddons === 0 && taxItems === 0)) ? (
                    // Show separate addon tax if it exists, or if addons exist but maybe tax is 0 (just to be complete if desired, but condition taxAddons > 0 is safer)
                    taxAddons > 0 && (
                      <View style={styles.rowBetween}>
                        <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('taxAddons') || 'Tax (Add-ons)'}</Text>
                        <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                          {formatCurrency(currency, taxAddons)}
                        </Text>
                      </View>
                    )
                  ) : null}

                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                  {/* 7. Grand Total */}
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.lg }}>{t('total')}</Text>
                    <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.xl }}>
                      {formatCurrency(currency, grandTotal)}
                    </Text>
                  </View>
                </>
              );
            }

            // Fallback to local calculation (Original Logic)
            const localBaseUniqueItems = items.reduce((s, it) => s + (it.basePrice * it.qty), 0);
            const localAddons = items.reduce((sum, it) => {
              return sum + (it.addons || []).reduce((aSum, a) => aSum + (Number(a.price || 0) * Number(a.quantity || 1)), 0);
            }, 0);
            const localDiscount = items.reduce((sum, it) => sum + (it.discountUnit * it.qty), 0);

            const renderItemsTotal = localBaseUniqueItems; // This is actually Original Price in local logic since discount is calc'd later
            const renderAddonsTotal = localAddons;
            const renderDiscount = localDiscount;
            const renderTax = taxTotal;
            const renderGrandTotal = total;

            return (
              <>
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('itemsPrice') || 'Items Price'}</Text>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                    {formatCurrency(currency, renderItemsTotal)}
                  </Text>
                </View>

                {renderDiscount > 0 && (
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('discount')}</Text>
                    <Text style={{ color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      -{formatCurrency(currency, renderDiscount)}
                    </Text>
                  </View>
                )}

                {renderAddonsTotal > 0 && (
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('addons') || 'Add-ons'}</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      {formatCurrency(currency, renderAddonsTotal)}
                    </Text>
                  </View>
                )}

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6, opacity: 0.5 }} />

                {/* Fallback doesn't easily support split 'Subtotal Excl Tax' without calc. 
                    Net = (Items + Addons - Discount). 
                */}
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.primary, fontSize: fontSize.md, fontFamily: 'Poppins-Medium' }}>{t('subtotalExclTax') || 'Subtotal (Excl. Tax)'}</Text>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                    {formatCurrency(currency, (renderItemsTotal + renderAddonsTotal - renderDiscount))}
                  </Text>
                </View>

                {renderTax > 0 && (
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>{t('tax') || 'Tax'}</Text>
                    <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', fontSize: fontSize.md }}>
                      {formatCurrency(currency, renderTax)}
                    </Text>
                  </View>
                )}

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.lg }}>{t('total')}</Text>
                  <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: fontSize.xl }}>
                    {formatCurrency(currency, renderGrandTotal)}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer for Checkout */}
      <View style={[styles.footer, {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingBottom: spacing.md + insets.bottom
      }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{items.reduce((s, it) => s + it.qty, 0)} {t('items')}</Text>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: 20 }}>
            {formatCurrency(currency, cart.totals?.grandTotal ?? total)}
          </Text>
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

      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
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
    biz: 1,
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
