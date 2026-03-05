import React, { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Image, Platform, ActivityIndicator, RefreshControl, Animated, Dimensions } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useLocation } from '../contexts/LocationContext';
import formatCurrency from '../utils/currency';
import { formatMinutesToUX } from '../utils/timeFormat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CheckoutAPI from '../utils/checkoutApi';
import AlertModal from './AlertModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CartDetail Component — Premium 3-Inspiration Blend
 * Design 1 (Vegan Bowl): Glassmorphism, frosted cards
 * Design 2 (Beef Cheesy): Gradient hero, floating images, info pills
 * Design 3 (Frutti Pizza): Clean circular images, elegant spacing
 */
export default function CartDetail({ vendorId, navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { getVendorCart, updateQuantity, removeItem, setDeliveryInstructionsForVendor, fetchCart } = useCart();
  const { products } = useProducts();
  const cart = getVendorCart(vendorId);
  const { colors, isDarkMode } = useTheme();
  const { currentLocation } = useLocation();
  const [updatingItem, setUpdatingItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', buttons: [] });

  // CTA shimmer animation
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(shimmerAnim, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  // ── Empty State ──
  if (!cart) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View style={{
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: colors.primary + '10',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: colors.primary + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="bag-outline" size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={{ fontSize: 22, fontFamily: 'Poppins-Bold', color: colors.text.primary, marginBottom: 8, textAlign: 'center' }}>
        {t('cartEmpty') || 'Your cart is empty'}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        {t('goAheadOrder') || "Looks like you haven't added anything yet."}
      </Text>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, elevation: 4 }}
        onPress={() => navigation?.goBack()}
        activeOpacity={0.85}
      >
        <Ionicons name="restaurant-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Poppins-SemiBold' }}>{t('browseFood') || 'Browse Food'}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Enrich items with product context ──
  const rawItems = Object.keys(cart.items || {}).map(id => ({ id, ...cart.items[id] }));
  const items = rawItems.map((it) => {
    let p = it.product || {};
    let contextProduct = null;
    if (products && products.length > 0) {
      const rawId = p.id || p._id || p.productId || it.productId || it.id;
      if (rawId) {
        contextProduct = products.find(
          (prod) => prod.id === rawId || prod._id === rawId || prod._raw?._id === rawId || prod._raw?.productId === rawId || prod._raw?.id === rawId || (prod._raw && (prod._raw.productId === rawId || prod._raw.id === rawId)),
        );
      }
    }
    if (contextProduct) {
      p = {
        ...p, image: contextProduct.image || p.image, name: contextProduct.name || p.name,
        _raw: { ...(contextProduct._raw || {}), ...(p._raw || {}), pricing: { ...(contextProduct._raw?.pricing || {}), ...(p._raw?.pricing || {}), ...(p.pricing || {}) } },
      };
    }
    const pricing = p._raw?.pricing || p.pricing || {};
    const productPricing = it.productPricing || {};
    const basePrice = Number(it.price || productPricing.originalPrice || 0);
    const discountPercent = Number(it.discountPercent || it.productPricing?.discountRate || 0);
    const taxPercent = Number(it.taxPercent || productPricing.taxRate || 0);
    const itemGrandTotal = Number(it.itemSummary?.grandTotal || 0);
    const itemQty = Number(it.quantity || it.qty || 1);
    const finalUnit = itemGrandTotal > 0 ? (itemGrandTotal / itemQty) : (it.finalUnit || 0);
    const discountUnit = (basePrice * discountPercent) / 100;
    const afterDiscount = basePrice - discountUnit;
    const taxUnit = (afterDiscount * taxPercent) / 100;
    return {
      ...it, product: p, qty: itemQty,
      currency: it.currency || pricing.currency || p.currency || '',
      basePrice, discountPercent, discountUnit, afterDiscount, taxPercent, taxUnit,
      finalUnit: finalUnit > 0 ? finalUnit : (afterDiscount + taxUnit),
      backendSubtotal: it.itemSummary?.grandTotal ?? it.subtotal ?? it.totalBeforeTax ?? null,
      addons: it.addons || [],
    };
  });

  const currency = items[0]?.currency || '';
  const total = items.reduce((s, it) => {
    if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) return s + Number(it.backendSubtotal);
    return s + it.finalUnit * it.qty;
  }, 0);

  // ── Vendor resolution ──
  const firstItem = items.length > 0 ? items[0] : null;
  let pcVendor = null; let pcProduct = null;
  if (products && products.length > 0 && firstItem) {
    const pId = firstItem.product.id || firstItem.product._id;
    const match = products.find(p => p.id === pId || p._id === pId);
    if (match) { pcProduct = match; pcVendor = match.vendor || match._raw?.vendor; }
  }
  if (!pcVendor && products && products.length > 0 && vendorId) {
    const match = products.find(p => {
      const v = p.vendor || {}; const r = p._raw || {}; const rv = r.vendor || {};
      const vid = String(vendorId);
      return String(v.vendorId) === vid || String(v.id) === vid || String(v._id) === vid || String(r.vendorId) === vid || String(rv.vendorId) === vid || String(rv._id) === vid;
    });
    if (match) { pcProduct = match; pcVendor = match.vendor || match._raw?.vendor; }
  }

  const extractRating = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val !== null) { if (val.average !== undefined) return extractRating(val.average); return null; }
    const num = Number(val); return !isNaN(num) ? num : null;
  };

  const finalVendorName = (pcVendor?.vendorName || pcVendor?.name) || (products && products.find(p => p.vendor?.vendorId === vendorId)?.name) || (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) || firstItem?.product?._raw?.vendor?.vendorName || t('vendor');
  const finalVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image || cart.vendorImage || firstItem?.product?.image || null;
  const ratingSources = [pcProduct?.rating, pcProduct?._raw?.rating, firstItem?.product?.productRating, firstItem?.product?.vendorRating, firstItem?.product?._raw?.rating, firstItem?.product?._raw?.vendorId?.rating, pcVendor?.rating, pcVendor?.businessDetails?.rating, firstItem?.product?._raw?.vendor?.rating, firstItem?.product?._raw?.businessDetails?.rating, firstItem?.product?._raw?.vendorId?.businessDetails?.rating, cart.vendorRating, cart.vendor?.rating];
  let finalVendorRating = null;
  for (const r of ratingSources) { const val = extractRating(r); if (val !== null && val > 0 && val <= 5) { finalVendorRating = Number(val).toFixed(1); break; } }

  const vendorLat = pcVendor?.latitude || firstItem?.product?._raw?.vendor?.latitude;
  const vendorLon = pcVendor?.longitude || firstItem?.product?._raw?.vendor?.longitude;
  let calculatedDeliveryTime = null;
  if (currentLocation?.latitude && currentLocation?.longitude && vendorLat && vendorLon) {
    const lat2 = parseFloat(vendorLat); const lon2 = parseFloat(vendorLon);
    if (!isNaN(lat2) && !isNaN(lon2)) {
      const R = 6371; const dLat = (lat2 - currentLocation.latitude) * (Math.PI / 180); const dLon = (lon2 - currentLocation.longitude) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(currentLocation.latitude * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); const distKm = R * c;
      const baseTime = Math.max(10, Math.round(distKm * 3) + 10);
      calculatedDeliveryTime = `${baseTime} - ${baseTime + 5} min`;
    }
  }
  const finalDeliveryTime = formatMinutesToUX(calculatedDeliveryTime || cart.vendorDeliveryTime || pcVendor?.deliveryTime || firstItem?.product?._raw?.vendor?.deliveryTime || pcProduct?.deliveryTime || '15 - 25 min');

  // ── Handlers ──
  const handleUpdateQuantity = async (itemId, delta) => {
    if (delta > 0) {
      const item = items.find(it => it.id === itemId);
      if (item) {
        const stockQty = item.product?._raw?.stock?.quantity;
        if (stockQty !== undefined && stockQty !== null) {
          const maxStock = parseInt(stockQty, 10);
          if (maxStock > 0 && (item.qty + delta) > maxStock) {
            setAlertConfig({ title: t('maxComplete') || 'Max Quantity Reached', message: `${t('only') || 'Only'} ${maxStock} ${t('itemsAvailable') || 'items available'}.\n${t('cannotAddMore') || 'Cannot add more to cart.'}`, icon: 'alert-circle', buttons: [{ text: t('ok') || 'OK', onPress: () => setAlertVisible(false) }] });
            setAlertVisible(true); return;
          }
        }
      }
    }
    const action = delta > 0 ? 'add' : 'remove';
    setUpdatingItem({ id: itemId, action });
    try {
      const item = items.find(it => it.id === itemId);
      if (item && item.qty + delta <= 0) { await removeItem(itemId, vendorId); }
      else {
        const res = await updateQuantity(itemId, delta, vendorId);
        if (res && !res.success) {
          let msg = res.error;
          if (msg && msg.toString().includes('quantity')) msg = `${t('cannotUpdateQty') || 'Cannot update quantity'}. ${t('stockLimitReached') || 'Stock limit might be reached.'}`;
          setAlertConfig({ title: t('error') || 'Error', message: msg || t('failedToUpdateCart') || 'Failed to update cart', icon: 'warning-outline', iconColor: colors.error || '#D32F2F', buttons: [{ text: t('ok') || 'OK', onPress: () => setAlertVisible(false) }] });
          setAlertVisible(true);
        }
      }
    } catch (err) { console.error("[CartDetail] Failed to update quantity", err); }
    finally { setUpdatingItem(null); }
  };

  const onCheckout = async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const subtotalAfterDiscount = items.reduce((s, it) => s + it.afterDiscount * it.qty, 0);
      const taxTotal = items.reduce((s, it) => { if (it.taxAmount !== undefined && it.taxAmount !== null) return s + Number(it.taxAmount); return s + it.taxUnit * it.qty; }, 0);
      const cartData = {
        vendorId, vendorName: cart.vendorName,
        items: items.map(it => ({ id: it.id, name: it.product?.name, quantity: it.qty, price: it.basePrice, discountPercent: it.discountPercent, taxPercent: it.taxPercent, finalPrice: it.finalUnit, currency: it.currency })),
        subtotal: subtotalAfterDiscount, tax: taxTotal, total, useCart: true,
      };
      navigation.navigate('Checkout', { cartData });
    } catch (e) { console.error('[CartDetail] Navigation error', e); }
    finally { setTimeout(() => setCheckingOut(false), 1000); }
  };

  const footerHeight = 110 + insets.bottom;
  const totalItems = items.reduce((s, it) => s + it.qty, 0);

  // Line total calculator
  const getLineTotal = (it) => {
    const serverItem = (cart?.checkoutInfo?.items || []).find(
      si => String(si.productId?._id || si.productId) === String(it.productId || it.product || it.id) && (!it.variationSku || si.variationSku === it.variationSku)
    );
    if (serverItem?.itemSummary?.grandTotal !== undefined) return serverItem.itemSummary.grandTotal;
    if (it.backendSubtotal !== null && it.backendSubtotal !== undefined) return it.backendSubtotal;
    const addonTotal = (it.addons || []).reduce((sum, a) => sum + (Number(a.price || 0) * Number(a.quantity || 1)), 0);
    return it.finalUnit * it.qty + addonTotal;
  };

  // ═══════════════════════════════════════════════
  // ══ RENDER ═════════════════════════════════════
  // ═══════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: footerHeight + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchCart({ force: true }); setRefreshing(false); }} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* ═══════ HERO VENDOR CARD — Design 2 (Beef Cheesy) gradient style ═══════ */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={isDarkMode ? ['#1A0A15', '#1A0A15', colors.background] : ['#FFE8F0', '#FFF5F8', colors.background]}
            style={styles.heroGradient}
          >
            <View style={styles.vendorRow}>
              {/* Circular vendor image — Design 3 */}
              {finalVendorImage ? (
                <View style={styles.vendorImgWrapper}>
                  <Image source={{ uri: finalVendorImage }} style={styles.vendorImg} />
                </View>
              ) : (
                <View style={[styles.vendorImgWrapper, {
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#fff',
                  alignItems: 'center', justifyContent: 'center'
                }]}>
                  <Ionicons name="restaurant" size={28} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{finalVendorName}</Text>
                {/* Info pills — Design 2 style */}
                <View style={styles.infoPillsRow}>
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="star" size={11} color="#FFA000" />
                    <Text style={[styles.infoPillText, { color: finalVendorRating ? colors.text.primary : '#FFA000' }]}>
                      {finalVendorRating || (t('new') || 'New')}
                    </Text>
                  </View>
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
                    <Text style={[styles.infoPillText, { color: colors.text.secondary }]}>{finalDeliveryTime}</Text>
                  </View>
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(220,49,115,0.15)' : 'rgba(220,49,115,0.08)' }]}>
                    <Ionicons name="restaurant-outline" size={11} color={colors.primary} />
                    <Text style={[styles.infoPillText, { color: colors.primary }]}>{totalItems} {t('items') || 'items'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ═══════ SECTION: Your Order — Design 3 style ═══════ */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBg, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="fast-food" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('yourOrder') || 'Your Order'}</Text>
        </View>

        {/* ═══════ CART ITEMS — Premium card design ═══════ */}
        <View style={{ paddingHorizontal: 16 }}>
          {items.map((it, idx) => (
            <View key={it.id} style={[styles.itemCard, {
              backgroundColor: colors.surface,
              borderColor: isDarkMode ? '#2A2A2A' : 'rgba(0,0,0,0.04)',
              shadowColor: isDarkMode ? '#000' : '#DC317320',
            }]}>
              {/* Top: Image + Info */}
              <View style={{ flexDirection: 'row' }}>
                {/* Floating food image with accent ring — Design 1+3 blend */}
                <View style={styles.itemImgContainer}>
                  {it.product.image ? (
                    <Image source={{ uri: it.product.image }} style={styles.itemImg} />
                  ) : (
                    <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F0F4' }]}>
                      <Text style={{ fontSize: 30 }}>🍽</Text>
                    </View>
                  )}
                  {/* Discount badge on image */}
                  {it.discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-{Math.round(it.discountPercent)}%</Text>
                    </View>
                  )}
                </View>

                {/* Item details */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={2}>{it.product.name}</Text>
                  {it.product._raw?.description && (
                    <Text style={{ color: colors.text.secondary, fontSize: 12, fontFamily: 'Poppins-Regular', marginTop: 2 }} numberOfLines={1}>{it.product._raw.description}</Text>
                  )}
                  {it.selectedVariation && (
                    <View style={[styles.variantPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F0F3' }]}>
                      <Ionicons name="options-outline" size={10} color={colors.primary} />
                      <Text style={{ color: colors.text.secondary, fontSize: 11, fontFamily: 'Poppins-Medium', marginLeft: 4 }}>{it.selectedVariation}</Text>
                    </View>
                  )}
                  {it.addons && it.addons.length > 0 && (
                    <View style={{ marginTop: 3 }}>
                      {it.addons.slice(0, 2).map((addon, ai) => (
                        <Text key={ai} style={{ color: colors.text.secondary, fontSize: 11, fontFamily: 'Poppins-Regular' }}>
                          + {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                        </Text>
                      ))}
                      {it.addons.length > 2 && (
                        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Poppins-Medium' }}>+{it.addons.length - 2} more</Text>
                      )}
                    </View>
                  )}
                  {/* Price row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>
                      {formatCurrency(it.currency, it.finalUnit)}
                    </Text>
                    {it.discountPercent > 0 && (
                      <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 12, color: colors.text.light || '#999', textDecorationLine: 'line-through', marginLeft: 6 }}>
                        {formatCurrency(it.currency, it.basePrice)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Bottom: Qty controls + Line total — Design 2 style */}
              <View style={styles.itemBottom}>
                <View style={[styles.qtyPill, { backgroundColor: colors.primary }]}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, -1)}
                    style={styles.qtyBtn}
                    disabled={updatingItem?.id === it.id || it.qty <= 0}
                  >
                    {updatingItem?.id === it.id && updatingItem?.action === 'remove' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name={it.qty <= 1 ? "trash-outline" : "remove"} size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.qtyValueBg}>
                    <Text style={[styles.qtyText, { color: colors.primary }]}>{it.qty}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(it.id, 1)}
                    style={styles.qtyBtn}
                    disabled={updatingItem?.id === it.id}
                  >
                    {updatingItem?.id === it.id && updatingItem?.action === 'add' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="add" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.lineTotal, { color: colors.text.primary }]}>
                  {formatCurrency(it.currency, getLineTotal(it))}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ═══════ DELIVERY INSTRUCTIONS — Design 1 glassmorphic ═══════ */}
        <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
          <View style={[styles.instructionsCard, {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(220,49,115,0.03)',
            borderColor: isDarkMode ? '#2A2A2A' : 'rgba(220,49,115,0.08)',
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.sectionIconBg, { backgroundColor: colors.primary + '14', width: 28, height: 28, borderRadius: 14 }]}>
                <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-SemiBold', marginLeft: 8, fontSize: 14 }}>
                {t('deliveryInstructions') || 'Delivery Instructions'}
              </Text>
            </View>
            <TextInput
              value={cart.deliveryInstructions || ''}
              onChangeText={(txt) => setDeliveryInstructionsForVendor(vendorId, txt)}
              placeholder={t('deliveryInstructionsPlaceholder') || 'e.g., Leave at door, Ring bell twice...'}
              placeholderTextColor={colors.text.light || '#999'}
              style={[styles.instructionsInput, { borderColor: isDarkMode ? '#333' : 'rgba(220,49,115,0.1)', color: colors.text.primary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fff' }]}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* ═══════ ORDER SUMMARY — Design 1 (Vegan Bowl) frosted card ═══════ */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <View style={[styles.summaryCard, {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
            borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.sectionIconBg, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name="receipt-outline" size={14} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text.primary, fontFamily: 'Poppins-Bold', fontSize: 16, marginLeft: 8 }}>
                {t('orderSummary') || 'Order Summary'}
              </Text>
            </View>

            {(() => {
              const totals = cart.totals || {};
              const itemsOriginal = cart?.checkoutInfo?.orderCalculation?.totalOriginalPrice || totals.itemsOriginalTotal || 0;
              const discount = cart?.checkoutInfo?.orderCalculation?.totalProductDiscount || totals.discount || 0;
              const addons = totals.addonsTotal || 0;
              const taxItems = cart?.checkoutInfo?.orderCalculation?.totalTaxAmount || totals.taxAmount || totals.itemsTax || 0;
              const taxAddons = totals.addonsTax || 0;
              const grandTotal = cart?.checkoutInfo?.payoutSummary?.grandTotal || totals.grandTotal || 0;
              const deliveryCharge = cart?.checkoutInfo?.delivery?.charge || 0;
              const deliveryVat = cart?.checkoutInfo?.delivery?.vatAmount || totals.deliveryTax || 0;
              const deliveryVatRate = cart?.checkoutInfo?.delivery?.vatRate || 0;

              return (
                <>
                  <SummaryRow label={t('subtotal') || 'Subtotal'} value={formatCurrency(currency, itemsOriginal)} colors={colors} />
                  {discount > 0 && <SummaryRow label={t('discount') || 'Discount'} value={`-${formatCurrency(currency, discount)}`} colors={colors} valueColor="#4CAF50" icon="pricetag" />}
                  {addons > 0 && <SummaryRow label={t('addons') || 'Add-ons'} value={formatCurrency(currency, addons)} colors={colors} />}
                  {taxItems > 0 && <SummaryRow label={t('taxItems') || 'Tax'} value={formatCurrency(currency, taxItems)} colors={colors} />}
                  {taxAddons > 0 && <SummaryRow label={t('taxAddons') || 'Tax (Add-ons)'} value={formatCurrency(currency, taxAddons)} colors={colors} />}
                  <SummaryRow label={t('delivery') || 'Delivery'} value={deliveryCharge > 0 ? formatCurrency(currency, deliveryCharge) : (t('free') || 'Free')} colors={colors} valueColor={deliveryCharge > 0 ? null : '#4CAF50'} icon="bicycle" />
                  {deliveryVat > 0 && <SummaryRow label={`${t('taxDelivery') || 'Delivery VAT'} ${deliveryVatRate ? `(${deliveryVatRate}%)` : ''}`} value={formatCurrency(currency, deliveryVat)} colors={colors} />}

                  <View style={[styles.summaryDivider, { backgroundColor: isDarkMode ? '#333' : '#E8E8E8' }]} />

                  <View style={styles.summaryRow}>
                    <Text style={{ fontSize: 17, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{t('total') || 'Total'}</Text>
                    <Text style={{ fontSize: 22, fontFamily: 'Poppins-Bold', color: colors.primary }}>
                      {formatCurrency(currency, grandTotal)}
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </ScrollView>

      {/* ═══════ STICKY FOOTER — Full-width gradient CTA ═══════ */}
      <View style={[styles.footer, {
        backgroundColor: colors.surface,
        borderTopColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
        paddingBottom: Platform.OS === 'android' ? Math.max(16, insets.bottom + 10) : Math.max(14, insets.bottom),
      }]}>
        {/* Price + item count */}
        <View style={{ marginRight: 16 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 12, fontFamily: 'Poppins-Regular' }}>
            {totalItems} {t('items') || 'items'}
          </Text>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Bold', fontSize: 22, marginTop: -2 }}>
            {formatCurrency(currency, cart?.checkoutInfo?.payoutSummary?.grandTotal || cart.totals?.grandTotal || total)}
          </Text>
        </View>

        {/* CTA with shimmer */}
        <TouchableOpacity
          style={{ flex: 1, borderRadius: 18, overflow: 'hidden', opacity: checkingOut ? 0.7 : 1 }}
          onPress={onCheckout}
          disabled={checkingOut}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#DC3173', '#B51D5C', '#A8154E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {/* Shimmer overlay */}
            <Animated.View
              style={{
                position: 'absolute', top: 0, bottom: 0, width: 50,
                transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [-1, 1], outputRange: [-60, SCREEN_WIDTH] }) }],
              }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>

            {checkingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaText}>{t('checkout') || 'Checkout'}</Text>
                <View style={styles.ctaArrowBg}>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AlertModal
        visible={alertVisible} title={alertConfig.title} message={alertConfig.message}
        icon={alertConfig.icon} iconColor={alertConfig.iconColor}
        buttons={alertConfig.buttons} onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

// ── Summary Row Subcomponent ──
const SummaryRow = ({ label, value, colors, valueColor, icon }) => (
  <View style={styles.summaryRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {icon && <Ionicons name={icon} size={13} color={valueColor || colors.text.secondary} style={{ marginRight: 6 }} />}
      <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{label}</Text>
    </View>
    <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: valueColor || colors.text.primary }}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════
// ══ STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  // Hero
  heroContainer: {
    overflow: 'hidden',
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorImgWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(220,49,115,0.2)',
    elevation: 4,
    shadowColor: '#DC3173',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  vendorImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vendorName: {
    fontSize: 19,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  infoPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  infoPillText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  // Item card
  itemCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  itemImgContainer: {
    position: 'relative',
  },
  itemImg: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(220,49,115,0.12)',
  },
  discountBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#DC3173',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    elevation: 2,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  itemName: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  variantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 3,
  },
  itemPrice: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  // Qty pill
  qtyPill: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#DC3173',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValueBg: {
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
  lineTotal: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  // Instructions
  instructionsCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  instructionsInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  // Summary
  summaryCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    letterSpacing: 0.3,
    marginRight: 10,
  },
  ctaArrowBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
