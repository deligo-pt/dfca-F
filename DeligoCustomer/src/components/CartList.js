import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTheme } from '../utils/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme';
import formatCurrency from '../utils/currency';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CartList({ navigation }) {
  const { cartsArray, getVendorSubtotal, clearVendorCartAndSync, enforceSingleVendor } = useCart();
  const { products } = useProducts();
  const { colors, isDarkMode } = useTheme();
  const [menuForVendor, setMenuForVendor] = useState(null);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [switchingVendorId, setSwitchingVendorId] = useState(null);
  const [vendorDetailsCache, setVendorDetailsCache] = useState({});

  // Effect: Check for missing/generic vendor names and fetch details
  React.useEffect(() => {
    const fetchMissingDetails = async () => {
      if (!cartsArray) return;

      for (const cart of cartsArray) {
        const name = cart.vendorName;
        const vid = cart.vendorId;
        // If name is missing or generic "Store"/"Vendor" and we haven't fetched it yet
        if ((!name || name === 'Store' || name === 'Vendor') && vid && !vendorDetailsCache[vid]) {
          try {
            const { API_ENDPOINTS, BASE_API_URL } = require('../constants/config');
            const StorageService = require('../utils/storage').default;

            const token = await StorageService.getAccessToken();
            const rawToken = (token && typeof token === 'object') ? (token.accessToken || token.token) : token;
            const authHeader = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.substring(7) : rawToken) : null;

            if (authHeader) {
              const res = await fetch(`${BASE_API_URL}${API_ENDPOINTS.RESTAURANTS.GET_DETAILS.replace(':id', vid)}`, {
                headers: { 'Authorization': authHeader }
              });
              if (res.ok) {
                const data = await res.json();
                const v = data.data || data;
                if (v && (v.vendorName || v.name)) {
                  setVendorDetailsCache(prev => ({
                    ...prev,
                    [vid]: {
                      name: v.vendorName || v.name || v.restaurantName,
                      image: v.storePhoto || v.logo || v.image,
                      rating: v.rating,
                      deliveryTime: v.deliveryTime
                    }
                  }));
                }
              }
            }
          } catch (e) {
            console.warn('[CartList] Failed to fetch vendor details for', vid, e);
            // Mark as attempted to avoid infinite loop
            setVendorDetailsCache(prev => ({ ...prev, [vid]: { failed: true } }));
          }
        }
      }
    };

    // Debounce slightly
    const t = setTimeout(fetchMissingDetails, 500);
    return () => clearTimeout(t);
  }, [cartsArray, vendorDetailsCache]);

  if (!cartsArray || cartsArray.length === 0) {
    return null;
  }

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
      {/* Overlay to close menu when tapping outside */}
      {menuForVendor && (
        <Pressable onPress={() => setMenuForVendor(null)} style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]} />
      )}
      {cartsArray.map((cart) => {
        const itemCount = Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id].quantity || 0), 0);
        const subtotal = getVendorSubtotal(cart.vendorId);

        // Try to get vendor info from multiple sources
        // 1. Cached details from API fetch
        // 2. Cart object itself
        // 3. ProductsContext lookup (User Request)
        // 4. First item in cart

        const cached = vendorDetailsCache[cart.vendorId];
        const firstId = cart.items && Object.keys(cart.items).length ? Object.keys(cart.items)[0] : null;
        const firstItem = firstId ? cart.items[firstId].product : null;

        // Lookup in ProductsContext using first item's ID
        let productContextMatch = null;
        if (products && products.length > 0 && firstItem) {
          const rawId = firstItem.id || firstItem._id || firstItem.productId;
          if (rawId) {
            // Try to find by ID or partial ID match
            productContextMatch = products.find(p =>
              p.id === rawId ||
              p._id === rawId ||
              (p._raw && (p._raw.productId === rawId || p._raw.id === rawId))
            );
          }
        }

        const pcVendor = productContextMatch?.vendor || productContextMatch?._raw?.vendor;
        const pcVendorName = pcVendor?.vendorName || pcVendor?.name;
        // Vendor image from context
        const pcVendorImage = pcVendor?.storePhoto || pcVendor?.logo || pcVendor?.image;
        // Product image from context (strong fallback)
        const pcProductImage = productContextMatch?.image;

        const finalVendorName = cached?.name ||
          (cart.vendorName && !['Store', 'Vendor'].includes(cart.vendorName) ? cart.vendorName : null) ||
          pcVendorName ||
          firstItem?._raw?.vendor?.vendorName ||
          'Store';

        const finalVendorImage = cached?.image ||
          cart.vendorImage ||
          pcVendorImage ||
          pcProductImage || // Use product image if vendor logo missing
          firstItem?._raw?.vendor?.storePhoto ||
          firstItem?.image ||
          null;

        // Debug log for troubleshooting image issues
        if (!finalVendorImage && cart.vendorId) {
          console.debug('[CartList] Image resolution failed for vendor', cart.vendorId, {
            cached: !!cached?.image,
            cartFields: !!cart.vendorImage,
            pcMatch: !!productContextMatch,
            pcVendorImage: !!pcVendorImage,
            pcProductImage: !!pcProductImage,
            firstItemImage: !!firstItem?.image
          });
        }

        const finalRating = cached?.rating ||
          cart.vendorRating ||
          pcVendor?.rating ||
          firstItem?._raw?.vendor?.rating ||
          '4.5';

        const finalDeliveryTime = cached?.deliveryTime ||
          cart.vendorDeliveryTime ||
          pcVendor?.deliveryTime ||
          firstItem?._raw?.vendor?.deliveryTime ||
          '30-40 min';


        const isMenuOpen = menuForVendor === cart.vendorId;

        return (
          <View key={cart.vendorId} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
              activeOpacity={0.9}
              style={[styles.vendorCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
            >
              <View style={styles.cardContent}>
                {/* Vendor Image */}
                <View style={styles.imageContainer}>
                  {finalVendorImage ? (
                    <Image source={{ uri: finalVendorImage }} style={styles.vendorImage} />
                  ) : (
                    <View style={[styles.vendorImagePlaceholder, { backgroundColor: colors.surface }]}>
                      <Ionicons name="storefront" size={24} color={colors.text.light} />
                    </View>
                  )}
                </View>

                {/* Info */}
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
                    <MaterialCommunityIcons name="moped" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.deliveryText, { color: colors.text.secondary }]}>
                      {finalDeliveryTime}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Footer */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('CartDetail', { vendorId: cart.vendorId })}
                >
                  <Text style={[styles.checkoutButtonText, { color: colors.text.white || '#fff' }]}>Go to Checkout</Text>
                  <View style={[styles.pricePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.pricePillText, { color: colors.text.white || '#fff' }]}>{formatCurrency(firstItem?.currency || '', subtotal)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Inline popover menu */}
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
                    <Text style={[styles.menuText, { color: colors.text.primary }]}>Set as Active</Text>
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
                    <Text style={[styles.menuText, { color: colors.error || '#D32F2F' }]}>Remove Cart</Text>
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
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1, // Optional: Glovo often uses very subtle borders if flat
    borderColor: '#eee',
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
  },
  vendorImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  vendorImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  vendorName: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    flex: 1,
    marginRight: 8,
  },
  itemsSummary: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  cardFooter: {
    marginTop: 16,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pricePillText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  // Popover styles
  popoverMenu: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  popoverContent: {
    borderRadius: 12,
    borderWidth: 1,
    width: 160,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    marginLeft: 10,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  menuDivider: {
    height: 1,
    width: '100%',
  },
});
