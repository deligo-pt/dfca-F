import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import formatCurrency from '../utils/currency';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * CartList Component
 * 
 * Renders a list of active shopping carts, separated by vendor.
 * Supports multi-vendor cart management (switching active carts, deleting drafts).
 * Resolves vendor details via context caches to ensure consistent branding.
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop.
 */
export default function CartList({ navigation }) {
  const { t } = useLanguage();
  const { cartsArray, getVendorSubtotal, clearVendorCartAndSync, enforceSingleVendor } = useCart();
  const { products } = useProducts();
  const { colors, isDarkMode } = useTheme();

  // State to track which vendor's options menu is currently open
  const [menuForVendor, setMenuForVendor] = useState(null);

  // Loading states for async actions
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [switchingVendorId, setSwitchingVendorId] = useState(null);

  // Cache for resolved vendor details to avoid repeated heavy lookups (optimization)
  const [vendorDetailsCache, setVendorDetailsCache] = useState({});

  if (!cartsArray || cartsArray.length === 0) {
    return null;
  }

  /**
   * Removes a specific vendor's cart from the state.
   * @param {string} vendorId 
   */
  const handleDeleteVendorCart = async (vendorId) => {
    if (!vendorId) return;
    setDeletingVendorId(vendorId);
    const res = await clearVendorCartAndSync(vendorId);
    setDeletingVendorId(null);
    setMenuForVendor(null);
    if (!res.success) {
      console.warn(res.error || 'Failed to delete cart');
    }
  };

  /**
   * Sets a specific vendor as the active context and navigates to the detailed view.
   * Useful when enforcing single-vendor constraints.
   * @param {string} vendorId 
   */
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
    <View style={{ padding: spacing.md, position: 'relative' }}>
      {/* Invisible overlay to handle outside taps for closing the active menu */}
      {menuForVendor && (
        <Pressable onPress={() => setMenuForVendor(null)} style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]} />
      )}

      {cartsArray.map((cart) => {
        const itemCount = Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id].quantity || 0), 0);
        const subtotal = getVendorSubtotal(cart.vendorId);

        // Data Resolution Strategy:
        // 1. Check local cache (vendorDetailsCache).
        // 2. Check the Cart object itself.
        // 3. Look up in 'ProductsContext' using the first item in the cart to find the parent vendor.

        const cached = vendorDetailsCache[cart.vendorId];
        const firstId = cart.items && Object.keys(cart.items).length ? Object.keys(cart.items)[0] : null;
        const firstItem = firstId ? cart.items[firstId].product : null;

        // Attempt to resolve vendor from the Product Context via the first item
        let productContextMatch = null;
        if (products && products.length > 0 && firstItem) {
          const rawId = firstItem.id || firstItem._id || firstItem.productId;
          if (rawId) {
            productContextMatch = products.find(p =>
              p.id === rawId ||
              p._id === rawId ||
              (p._raw && (p._raw.productId === rawId || p._raw.id === rawId))
            );
          }
        }

        // Secondary fallback: Match any product by Vendor ID if item lookup fails
        if (!productContextMatch && products && products.length > 0 && cart.vendorId) {
          productContextMatch = products.find(p => {
            const v = p.vendor || {};
            const r = p._raw || {};
            const rv = r.vendor || {};
            const vid = String(cart.vendorId);
            return String(v.vendorId) === vid ||
              String(v.id) === vid ||
              String(v._id) === vid ||
              String(r.vendorId) === vid ||
              String(rv.vendorId) === vid ||
              String(rv._id) === vid;
          });
        }

        const pcVendor = productContextMatch?.vendor || productContextMatch?._raw?.vendor;
        const pcVendorName = pcVendor?.vendorName || pcVendor?.name || productContextMatch?.name;
        const pcVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image;
        const pcProductImage = productContextMatch?.image;

        // Finalize display values with a prioritized waterfall
        const finalVendorName = pcVendorName ||
          cached?.name ||
          (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) ||
          firstItem?._raw?.vendor?.vendorName ||
          t('store');

        const finalVendorImage = pcVendorImage ||
          pcProductImage ||
          cached?.image ||
          cart.vendorImage ||
          firstItem?._raw?.vendor?.storePhoto ||
          firstItem?.image ||
          null;

        const finalDeliveryTime = cached?.deliveryTime ||
          cart.vendorDeliveryTime ||
          pcVendor?.deliveryTime ||
          firstItem?._raw?.vendor?.deliveryTime ||
          null;

        const isMenuOpen = menuForVendor === cart.vendorId;

        return (
          <View key={cart.vendorId} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
              activeOpacity={0.9}
              style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
            >
              <View style={styles.cardContent}>
                {/* Vendor Logo / Placeholder */}
                <View style={styles.imageContainer}>
                  {finalVendorImage ? (
                    <Image source={{ uri: finalVendorImage }} style={styles.vendorImage} />
                  ) : (
                    <View style={[styles.vendorImagePlaceholder, { backgroundColor: colors.surface }]}>
                      <Ionicons name="storefront" size={24} color={colors.text.light} />
                    </View>
                  )}
                </View>

                {/* Vendor Details */}
                <View style={styles.infoContainer}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>
                      {finalVendorName}
                    </Text>
                    {/* Menu Trigger */}
                    <TouchableOpacity
                      onPress={() => setMenuForVendor(isMenuOpen ? null : cart.vendorId)}
                      hitSlop={15}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.light} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.itemsSummary, { color: colors.text.secondary }]} numberOfLines={1}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatCurrency(firstItem?.currency || '', subtotal)}
                  </Text>

                  <View style={styles.deliveryRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="star" size={12} color="#FFA000" />
                      <Text style={{ color: colors.text.primary, fontSize: 12, fontFamily: 'Poppins-Bold', marginLeft: 4 }}>
                        {pcVendor && pcVendor.rating !== undefined && pcVendor.rating !== null ? Number(pcVendor.rating).toFixed(1) : (t('new') || 'New')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="moped" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.deliveryText, { color: colors.text.secondary }]}>
                        {finalDeliveryTime || 'Standard'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Footer Button */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
                >
                  <Text style={[styles.checkoutButtonText, { color: colors.text.white || '#fff' }]}>{t('goToCheckout')}</Text>
                  <View style={[styles.pricePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.pricePillText, { color: colors.text.white || '#fff' }]}>{formatCurrency(firstItem?.currency || '', subtotal)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Context Menu (Popover) */}
            {isMenuOpen && (
              <View style={styles.popoverMenu}>
                <View style={[styles.popoverContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    disabled={switchingVendorId === cart.vendorId}
                    onPress={() => handleSwitchVendor(cart.vendorId)}
                    style={styles.menuItem}
                  >
                    {switchingVendorId === cart.vendorId ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                    )}
                    <Text style={[styles.menuText, { color: colors.text.primary }]}>{t('setAsActive')}</Text>
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                  <TouchableOpacity
                    disabled={deletingVendorId === cart.vendorId}
                    onPress={() => handleDeleteVendorCart(cart.vendorId)}
                    style={styles.menuItem}
                  >
                    {deletingVendorId === cart.vendorId ? (
                      <ActivityIndicator size="small" color={colors.error || '#D32F2F'} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={colors.error || '#D32F2F'} />
                    )}
                    <Text style={[styles.menuText, { color: colors.error || '#D32F2F' }]}>{t('removeCart')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  vendorCard: {
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 4, // Add spacing for shadow
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 16,
  },
  vendorImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  vendorImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  itemsSummary: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginBottom: 6,
    color: '#666',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  cardFooter: {
    marginTop: 20,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pricePillText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  // Popover styles - Enhanced
  popoverMenu: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  popoverContent: {
    borderRadius: 16,
    borderWidth: 1,
    width: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  menuDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
});
