import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useLocation } from '../contexts/LocationContext';
import { useDelivery } from '../contexts/DeliveryContext';
import formatCurrency from '../utils/currency';
import { formatMinutesToUX } from '../utils/timeFormat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * CartList Component — Premium Redesign
 * Renders active shopping carts separated by vendor with a premium card UI.
 */
export default function CartList({ navigation }) {
  const { t } = useLanguage();
  const { cartsArray, getVendorSubtotal, clearVendorCartAndSync, enforceSingleVendor } = useCart();
  const { products } = useProducts();
  const { colors, isDarkMode } = useTheme();
  const { currentLocation } = useLocation();

  const [menuForVendor, setMenuForVendor] = useState(null);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [switchingVendorId, setSwitchingVendorId] = useState(null);
  const [vendorDetailsCache, setVendorDetailsCache] = useState({});
  const { fetchEstimate, getFormattedRange } = useDelivery();

  // ── Centralized Delivery ETA ─────────────────────────────────────────────
  React.useEffect(() => {
    if (!cartsArray?.length) return;

    cartsArray.forEach(cart => {
      const vid = cart.vendorId;
      // Try to resolve vendor coords from products
      if (products && products.length > 0) {
        const match = products.find(p => {
          const v = p.vendor || {}; const r = p._raw || {}; const rv = r.vendor || {};
          const vs = String(vid);
          return String(v.vendorId) === vs || String(v._id) === vs || String(rv.vendorId) === vs || String(rv._id) === vs;
        });
        const v = match?.vendor || match?._raw?.vendor;
        if (v?.latitude && v?.longitude) {
           fetchEstimate(vid, v.latitude, v.longitude);
        }
      }
    });
  }, [cartsArray?.length, products]);
  // ──────────────────────────────────────────────────────────────────────────

  if (!cartsArray || cartsArray.length === 0) return null;

  const handleDeleteVendorCart = async (vendorId) => {
    if (!vendorId) return;
    setDeletingVendorId(vendorId);
    const res = await clearVendorCartAndSync(vendorId);
    setDeletingVendorId(null);
    setMenuForVendor(null);
    if (!res.success) console.warn(res.error || 'Failed to delete cart');
  };

  const handleSwitchVendor = async (vendorId) => {
    if (!vendorId) return;
    setSwitchingVendorId(vendorId);
    try {
      await enforceSingleVendor(vendorId);
      setMenuForVendor(null);
      navigation.navigate('CartDetail', { vendorId });
    } finally {
      setSwitchingVendorId(null);
    }
  };

  return (
    <View style={{ padding: 16, position: 'relative' }}>
      {menuForVendor && (
        <Pressable onPress={() => setMenuForVendor(null)} style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]} />
      )}

      {cartsArray.map((cart, index) => {
        const itemCount = Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id].quantity || 0), 0);
        const subtotal = getVendorSubtotal(cart.vendorId);
        const cached = vendorDetailsCache[cart.vendorId];
        const firstId = cart.items && Object.keys(cart.items).length ? Object.keys(cart.items)[0] : null;
        const firstItem = firstId ? cart.items[firstId].product : null;

        let productContextMatch = null;
        if (products && products.length > 0 && firstItem) {
          const rawId = firstItem.id || firstItem._id || firstItem.productId;
          if (rawId) productContextMatch = products.find(p => p.id === rawId || p._id === rawId || (p._raw && (p._raw.productId === rawId || p._raw.id === rawId)));
        }
        if (!productContextMatch && products && products.length > 0 && cart.vendorId) {
          productContextMatch = products.find(p => {
            const v = p.vendor || {}; const r = p._raw || {}; const rv = r.vendor || {}; const vid = String(cart.vendorId);
            return String(v.vendorId) === vid || String(v.id) === vid || String(v._id) === vid || String(r.vendorId) === vid || String(rv.vendorId) === vid || String(rv._id) === vid;
          });
        }

        const pcVendor = productContextMatch?.vendor || productContextMatch?._raw?.vendor;
        const finalVendorName = pcVendor?.vendorName || pcVendor?.name || productContextMatch?.name || cached?.name || (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) || firstItem?._raw?.vendor?.vendorName || t('store');
        const finalVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image || productContextMatch?.image || cached?.image || cart.vendorImage || firstItem?._raw?.vendor?.storePhoto || firstItem?.image || null;

        const extractRating = (val) => {
          if (val === null || val === undefined) return null;
          if (typeof val === 'object' && val !== null) { if (val.average !== undefined) return extractRating(val.average); return null; }
          const num = Number(val); return !isNaN(num) ? num : null;
        };

        // Use centralized delivery time
        const finalDeliveryTime = getFormattedRange(
          cart.vendorId, 
          cached?.deliveryTime || cart.vendorDeliveryTime || pcVendor?.deliveryTime || firstItem?._raw?.vendor?.deliveryTime || '20 - 30 min'
        );

        const ratingSources = [productContextMatch?.rating, productContextMatch?._raw?.rating, firstItem?.product?.productRating, firstItem?.product?.vendorRating, firstItem?._raw?.rating, cached?.rating, cart.vendorRating, firstItem?._raw?.vendorId?.rating, pcVendor?.rating, pcVendor?.businessDetails?.rating, firstItem?._raw?.vendor?.rating, firstItem?._raw?.businessDetails?.rating];
        let finalVendorRating = null;
        for (const r of ratingSources) { const val = extractRating(r); if (val !== null && val > 0) { finalVendorRating = Number(val).toFixed(1); break; } }

        const isMenuOpen = menuForVendor === cart.vendorId;
        const finalTotal = cart.totals?.grandTotal ?? subtotal;
        const formattedTotal = formatCurrency(firstItem?.currency || '', finalTotal);

        return (
          <View key={cart.vendorId} style={{ marginBottom: 20 }}>
            {/* Context Menu (Popover) - Placed below to avoid overlapping issues */}
            {isMenuOpen && (
              <View style={[styles.popoverMenu, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#333' : '#E8E8E8' }]}>
                <TouchableOpacity disabled={switchingVendorId === cart.vendorId} onPress={() => handleSwitchVendor(cart.vendorId)} style={styles.menuItem}>
                  {switchingVendorId === cart.vendorId ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />}
                  <Text style={[styles.menuText, { color: colors.text.primary }]}>{t('setAsActive') || 'Set as Active'}</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]} />
                <TouchableOpacity disabled={deletingVendorId === cart.vendorId} onPress={() => handleDeleteVendorCart(cart.vendorId)} style={styles.menuItem}>
                  {deletingVendorId === cart.vendorId ? <ActivityIndicator size="small" color={colors.error || '#D32F2F'} /> : <Ionicons name="trash-outline" size={18} color={colors.error || '#D32F2F'} />}
                  <Text style={[styles.menuText, { color: colors.error || '#D32F2F' }]}>{t('removeCart') || 'Delete Cart'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
              activeOpacity={0.9}
              style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }]}
            >
              {/* Top Row: Vendor Info */}
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {/* Circular vendor image with brand ring */}
                  <View style={styles.vendorImgWrapper}>
                    {finalVendorImage ? (
                      <Image source={{ uri: finalVendorImage }} style={styles.vendorImage} />
                    ) : (
                      <View style={[styles.vendorImage, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F0F3', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="storefront" size={20} color={colors.text.light} />
                      </View>
                    )}
                  </View>

                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>{finalVendorName}</Text>
                    {/* Info Pills */}
                    <View style={styles.infoPillsRow}>
                      <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF8E1' }]}>
                        <Ionicons name="star" size={11} color="#FFA000" />
                        <Text style={[styles.infoPillText, { color: finalVendorRating ? colors.text.primary : '#FFA000' }]}>
                          {finalVendorRating || 'New'}
                        </Text>
                      </View>
                      <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5' }]}>
                        <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
                        <Text style={[styles.infoPillText, { color: colors.text.secondary }]}>{finalDeliveryTime}</Text>
                      </View>
                      <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(220,49,115,0.15)' : 'rgba(220,49,115,0.08)' }]}>
                        <Ionicons name="restaurant-outline" size={11} color={colors.primary} />
                        <Text style={[styles.infoPillText, { color: colors.primary }]}>{itemCount} {t('items') || 'items'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Overflows ellipsis */}
                <TouchableOpacity onPress={() => setMenuForVendor(isMenuOpen ? null : cart.vendorId)} hitSlop={15} style={styles.menuDots}>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.text.light} />
                </TouchableOpacity>
              </View>

              {/* Bottom Row: CTA Button */}
              <View style={styles.cardFooter}>
                <LinearGradient
                  colors={['#DC3173', '#A8154E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkoutGradient}
                >
                  <Text style={styles.checkoutButtonText}>{t('goToCheckout') || 'View Cart'}</Text>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>{formattedTotal}</Text>
                  </View>
                </LinearGradient>
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
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  vendorImgWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: 'rgba(220,49,115,0.2)',
    overflow: 'hidden',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vendorName: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  infoPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  infoPillText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  menuDots: {
    padding: 4,
  },
  cardFooter: {
    marginTop: 18,
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.3,
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pricePillText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  // Popover
  popoverMenu: {
    position: 'absolute',
    top: 36,
    right: 36,
    zIndex: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: 170,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  menuDivider: {
    height: 1,
    width: '100%',
  },
});
