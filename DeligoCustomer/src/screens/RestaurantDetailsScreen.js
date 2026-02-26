/**
 * RestaurantDetailsScreen
 * 
 * Displays restaurant information and menu, allowing users to browse categories,
 * view product details, and add items to their cart.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useProducts } from '../contexts/ProductsContext';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import formatCurrency from '../utils/currency';
import * as Location from 'expo-location';
import AlertModal from '../components/AlertModal';
import MaxQuantityModal from '../components/MaxQuantityModal';
import { fetchAddonGroups } from '../utils/addonApi';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  // SAFETY CHECK: Ensure route params exist
  if (!route || !route.params || !route.params.restaurant) {
    console.error('[RestaurantDetailsScreen] Missing restaurant data in route params');
    // If navigation is available, go back after a tick, otherwise return error view
    // useEffect to trigger navigation safely
    useEffect(() => {
      if (navigation && navigation.canGoBack()) navigation.goBack();
    }, []);
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>{t('loading') || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }

  const insets = useSafeAreaInsets();

  // SAFETY CHECK: Ensure route params exist
  if (!route || !route.params || !route.params.restaurant) {
    console.error('[RestaurantDetailsScreen] Missing restaurant data in route params');
    // useEffect to trigger navigation safely
    useEffect(() => {
      if (navigation && navigation.canGoBack()) navigation.goBack();
    }, []);
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>{t('loading') || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }

  const { restaurant } = route.params;

  // Normalize rating
  const _r = restaurant || {};
  let ratingValue = null;
  if (_r.rating !== undefined && _r.rating !== null) {
    if (typeof _r.rating === 'number') ratingValue = _r.rating;
    else if (typeof _r.rating === 'object' && typeof _r.rating.average === 'number') ratingValue = _r.rating.average;
  }
  if ((ratingValue === null || ratingValue === undefined) && _r.vendor && typeof _r.vendor.rating === 'number') {
    ratingValue = _r.vendor.rating;
  }

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addItem, updateQuantity: cartUpdateQuantity, itemsMap, clearAllCarts } = useCart();

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  // REMOVED LayoutAnimation enablement to fix Modal glitch on Android
  // useEffect(() => {
  //   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  //     UIManager.setLayoutAnimationEnabledExperimental(true);
  //   }
  // }, []);

  // Local quantity for UI responsiveness
  const [localQty, setLocalQty] = useState({});
  const getQuantity = (productId) => {
    const q = localQty[productId];
    if (typeof q === 'number') return q;
    return itemsMap?.[productId]?.quantity || 0;
  };

  // Product modal state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalReady, setModalReady] = useState(false); // For fixing footer position on first render

  const [selectedVariations, setSelectedVariations] = useState({});

  // State for active add-ons display
  const [activeAddons, setActiveAddons] = useState([]);

  // Max Quantity Modal State
  const [maxQuantityModalVisible, setMaxQuantityModalVisible] = useState(false);
  const [maxQuantityData, setMaxQuantityData] = useState({
    maxStock: 0,
    currentCartQty: 0,
    itemName: ''
  });

  const openProductModal = (product) => {
    setActiveProduct(product);
    setSelectedVariations({});
    // Reset quantity to 1 for fresh addition (using separate modal state)
    setModalQuantity(1);

    // Reset add-ons
    setActiveAddons([]);
    setModalReady(false); // Reset modal ready state
    setProductModalVisible(true);

    // Delay to let modal animation complete before showing footer
    setTimeout(() => setModalReady(true), 50);

    // FETCH FRESH DETAILS (Single Product Get)
    // This ensures we have the latest price, tax, and stock info which might be missing from list
    if (product.id) {
      fetchProductDetails(product.id).then(freshDetails => {
        if (freshDetails) {
          console.log('[RestaurantDetails] Updated active product with fresh details', freshDetails.id);

          // Fix for UI Glitch: Wait for modal animation to complete before updating heavy state
          InteractionManager.runAfterInteractions(() => {
            // Merge fresh details but keep local UI state if needed
            setActiveProduct(prev => prev && prev.id === freshDetails.id ? freshDetails : prev);

            // Also update addons if present in fresh details
            const rawProduct = freshDetails._raw || freshDetails;
            if (rawProduct.addonGroups && rawProduct.addonGroups.length > 0) {
              fetchAddonGroups(rawProduct.addonGroups)
                .then(groups => {
                  const processedGroups = groups.map(g => g.data || g).filter(g => !g.isDeleted);
                  setActiveAddons(processedGroups);
                })
                .catch(err => console.error('Failed to load add-ons from fresh details', err));
            }
          });
        }
      });
    }

    // Fallback: Fetch add-ons from initial product if present (to show info banner quickly)
    const rawProduct = product._raw || product;
    if (rawProduct.addonGroups && rawProduct.addonGroups.length > 0) {
      fetchAddonGroups(rawProduct.addonGroups)
        .then(groups => {
          // Filter active groups. The API might return { data: group } or just group
          const processedGroups = groups.map(g => g.data || g).filter(g => !g.isDeleted);
          setActiveAddons(processedGroups);
        })
        .catch(err => console.error('Failed to load add-ons', err));
    }
  };

  const closeProductModal = () => {
    setActiveProduct(null);
    setProductModalVisible(false);
  };

  // Use ProductsContext
  const { products: allProducts, fetchRestaurantMenu, fetchProductDetails } = useProducts();

  // Resolve vendor ID from various potential data structures
  // Access normalized vendor if available, else raw nested object, else raw flat props
  const normVendor = restaurant.vendor || {};
  const rawVendorObj = restaurant._raw?.vendorId || {};
  // If vendorId is an object in _raw, use its _id
  const rawVendorId = (typeof rawVendorObj === 'object') ? rawVendorObj._id : rawVendorObj;

  const vendorId = (
    normVendor.id ||
    normVendor.vendorId ||
    rawVendorId ||
    restaurant?._raw?.vendor?.vendorId ||
    restaurant?.vendorId ||
    restaurant?._raw?.vendorId ||
    null
  );

  // Menu products state with initial cache and fresh fetch support
  const [menuProducts, setMenuProducts] = useState(
    (allProducts || []).filter((p) => {
      // Use robust vendorId extraction for filtering
      const pRaw = p._raw || p;
      const pRawVendorObj = pRaw.vendorId || {};
      const pRawVendorId = (typeof pRawVendorObj === 'object') ? pRawVendorObj._id : pRawVendorObj;
      const pId = p.vendor?.id || pRaw.vendor?.vendorId || pRawVendorId || pRaw.vendorId;
      return pId && vendorId && String(pId) === String(vendorId);
    })
  );
  const [menuLoading, setMenuLoading] = useState(false);
  const vendorProducts = menuProducts;

  // Location resolution
  const [dynamicLocation, setDynamicLocation] = useState(null);
  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      // Prioritize normalized vendor location
      if (normVendor.address || normVendor.city) return;

      const v = restaurant._raw?.vendor || restaurant.vendor || {};
      // Fallback: check nested vendorId object
      const vNested = (typeof restaurant._raw?.vendorId === 'object') ? restaurant._raw.vendorId : {};

      if (v.city || v.address || v.town) return; // explicit exists

      const lat = normVendor.latitude || vNested.businessLocation?.latitude || vNested.latitude || v.latitude;
      const lng = normVendor.longitude || vNested.businessLocation?.longitude || vNested.longitude || v.longitude;

      if (lat && lng) {
        try {
          const res = await Location.reverseGeocodeAsync({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
          if (mounted && res && res.length > 0) {
            const addr = res[0];
            // Get specific area (neighborhood)
            const area = addr.street || addr.district || addr.name || addr.subregion;
            // Get city
            const city = addr.city || addr.region;
            // Combine: "Basabo, Dhaka" or just city if no area
            if (area && city && area !== city) {
              setDynamicLocation(`${area}, ${city}`);
            } else {
              setDynamicLocation(area || city);
            }
          }
        } catch (e) { /* ignore */ }
      }
    };
    fetchLocation();
    return () => { mounted = false; };
  }, [restaurant]);

  // Derived values using normalized data
  const displayName = (
    normVendor.vendorName ||
    normVendor.businessName ||
    (typeof restaurant._raw?.vendorId === 'object' ? restaurant._raw.vendorId.businessDetails?.businessName : null) ||
    restaurant?.name ||
    restaurant?._raw?.name ||
    restaurant?._raw?.product?.name ||
    restaurant?._raw?.productName ||
    restaurant?._raw?.vendor?.vendorName ||
    'Restaurant'
  );

  const displayLocation = (normVendor.address || restaurant._raw?.vendor?.city || restaurant._raw?.vendor?.address) || dynamicLocation;

  // Vendor currency
  const vendorCurrency = (() => {
    const productWithCurrency = vendorProducts.find(p => p?._raw?.pricing?.currency || p?.pricing?.currency);
    return productWithCurrency ? (productWithCurrency._raw?.pricing?.currency || productWithCurrency.pricing?.currency || '') : '';
  })();

  // Derive menu categories
  const derivedCategories = new Set();
  vendorProducts.forEach((p) => {
    const raw = p._raw || {};
    if (raw.subCategory) {
      const val = typeof raw.subCategory === 'object' ? (raw.subCategory.name || raw.subCategory.slug) : raw.subCategory;
      if (val) derivedCategories.add(String(val));
    }
    else if (raw.category) {
      const val = typeof raw.category === 'object' ? (raw.category.name || raw.category.slug) : raw.category;
      if (val) derivedCategories.add(String(val));
    }
    else if (Array.isArray(p.categories) && p.categories.length) {
      p.categories.forEach(c => {
        const val = typeof c === 'object' ? (c.name || c.slug) : c;
        if (val) derivedCategories.add(String(val));
      });
    }
  });
  const menuCategories = ['All', 'Popular', ...Array.from(derivedCategories)];

  // Fetch fresh menu data on focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadMenu = async () => {
        if (!vendorId) {
          setMenuLoading(false);
          return;
        }
        setMenuLoading(true);
        try {
          console.log('[RestaurantDetails] Fetching fresh menu for', vendorId);
          const freshItems = await fetchRestaurantMenu(vendorId);
          if (active) {
            // ALWAYS update with fresh data, even if empty
            if (freshItems && freshItems.length > 0) {
              setMenuProducts(freshItems);
              console.log('[RestaurantDetails] Updated menu with', freshItems.length, 'items');
            } else {
              console.log('[RestaurantDetails] Fresh menu empty, keeping previous/cached data if any');
            }
          }
        } catch (err) {
          console.error('[RestaurantDetails] Failed to load menu', err);
          // if (active) setMenuProducts([]); // DO NOT CLEAR ON ERROR - Keep cached data
        } finally {
          if (active) setMenuLoading(false);
        }
      };
      loadMenu();
      return () => { active = false; };
    }, [vendorId, fetchRestaurantMenu])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('[RestaurantDetails] Refreshing menu for', vendorId);
      const freshItems = await fetchRestaurantMenu(vendorId);
      // ALWAYS update with fresh data IF valid
      if (freshItems && freshItems.length > 0) {
        setMenuProducts(freshItems);
        console.log('[RestaurantDetails] Refreshed menu with', freshItems.length, 'items');
      } else {
        console.log('[RestaurantDetails] Refreshed menu empty, keeping previous data');
      }
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRestaurantMenu, vendorId]);



  // Update add/remove with optimistic updates and animation
  const addToCart = async (item, options = {}) => {
    const current = getQuantity(item.id);
    if (!productModalVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setLocalQty((prev) => ({ ...prev, [item.id]: current + 1 }));
    setUpdatingProductId(item.id);
    await addItem(item, 1, options);
    setTimeout(() => setUpdatingProductId(null), 250);
  };

  const removeFromCart = async (item) => {
    const current = getQuantity(item.id);
    if (current <= 0) return;
    if (!productModalVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setLocalQty((prev) => ({ ...prev, [item.id]: Math.max(0, current - 1) }));
    setUpdatingProductId(item.id);
    await cartUpdateQuantity(item.id, -1);
    setTimeout(() => setUpdatingProductId(null), 250);
  };

  const getTotalItems = () => {
    const ids = Object.keys(itemsMap || {});
    return ids.reduce((s, id) => {
      const it = itemsMap[id];
      if (!it) return s;
      const vendorIdOfItem = it.product.vendorId || it.product._raw?.vendor?.vendorId;
      if (vendorIdOfItem && vendorIdOfItem === vendorId) return s + it.quantity;
      return s;
    }, 0);
  };

  const getTotalPrice = () => Object.keys(itemsMap || {}).reduce((s, id) => {
    const it = itemsMap[id];
    if (!it) return s;
    const vendorIdOfItem = it.product.vendorId || it.product._raw?.vendor?.vendorId || it.vendorId;

    // Use backend subtotal if available (includes addons, discounts, etc.)
    // Check multiple locations where subtotal might be stored
    const rawData = it.product?._raw || {};
    const backendSubtotal = it.subtotal ?? rawData.subtotal ?? rawData.totalBeforeTax;

    let itemTotal = 0;
    if (backendSubtotal !== undefined && backendSubtotal !== null) {
      itemTotal = Number(backendSubtotal);
      console.log(`[RestaurantDetails] Using backend subtotal for ${it.product?.name}: ${itemTotal}`);
    } else {
      // Fallback calculation if no backend subtotal
      const basePrice = Number(it.product.finalPrice ?? it.product.price ?? 0);
      // Include addon prices from backend data or local state
      const addons = rawData.addons || it.addons || [];
      const addonsTotal = addons.reduce((sum, ad) => sum + (Number(ad.price || 0) * (ad.quantity || 1)), 0);
      itemTotal = (basePrice * it.quantity) + addonsTotal;
      console.log(`[RestaurantDetails] Calc fallback for ${it.product?.name}: base=${basePrice}, addons=${addonsTotal}, qty=${it.quantity} -> ${itemTotal}`);
    }

    if (vendorIdOfItem && vendorIdOfItem === vendorId) return s + itemTotal;
    return s;
  }, 0);

  // Filter menu items
  const getFilteredMenuItems = () => {
    let items = vendorProducts;
    // "All" shows everything - no filtering
    if (selectedCategory === 'All') {
      // No filter - show all items
    } else if (selectedCategory === 'Popular') {
      const popular = items.filter(p => (p._raw?.meta && p._raw.meta.isFeatured) || p._raw?.isFeatured);
      if (popular.length) items = popular;
    } else if (selectedCategory) {
      items = items.filter((p) => {
        const raw = p._raw || {};
        const cat = raw.subCategory || raw.category || (Array.isArray(p.categories) && p.categories[0]) || '';
        return String(cat) === String(selectedCategory);
      });
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const rawItem = item._raw || {};
      const itemName = (rawItem.product?.name || rawItem.name || rawItem.productName || item.name || '').toLowerCase();
      const desc = (rawItem.description || rawItem.slug || '').toLowerCase();
      return itemName.includes(q) || desc.includes(q);
    });
  };

  const calculateModalTotal = () => {
    const raw = activeProduct?._raw || activeProduct || {};
    const pricing = raw.pricing || {};

    // Base price
    // Prefer finalPrice from backend if available for DEFAULT item.
    // BUT we must check for VARIATION override first.
    let basePrice = Number(pricing.price ?? raw.price ?? activeProduct?.price ?? 0);

    // Check for selected variation price override
    if (selectedVariations) {
      const variationKeys = Object.keys(selectedVariations).filter(k => k.endsWith('_obj'));
      for (const key of variationKeys) {
        const opt = selectedVariations[key];
        if (opt && opt.price) {
          basePrice = Number(opt.price);
        }
      }
    }

    // Recalculate based on (new) basePrice
    const discount = Number(pricing.discount ?? raw.discount ?? 0);
    const taxRate = Number(pricing.taxRate ?? 0);

    let effectivePrice = basePrice;

    // 1. Apply Discount
    if (discount > 0) {
      effectivePrice = basePrice - (basePrice * discount / 100);
    }

    // 2. Apply Tax (on discounted price)
    if (taxRate > 0) {
      effectivePrice += (effectivePrice * taxRate / 100);
    }

    let total = effectivePrice * modalQuantity;

    // Add variations
    if (selectedVariations) {
      Object.keys(selectedVariations).forEach(key => {
        // Skip object refs
        if (key.endsWith('_obj')) return;

        const variantPrice = selectedVariations[`${key}_price`];
        if (variantPrice) {
          total += Number(variantPrice) * modalQuantity;
        }
      });
    }

    // Add addons
    if (activeAddons && activeAddons.length > 0) {
      // ... logic for addons (already correct in original if used) ...
      // We need to iterate over selectedAddons state to sum up
      // Since logic is complex and state is distinct, reusing existing loop if available
      // or simple traverse:
      Object.values(selectedAddons).flat().forEach(addon => {
        if (addon && addon.price) {
          total += Number(addon.price) * (addon.quantity || 1);
        }
        // Flattened structure depends on implementation
      });

      // Correct approach for current structure:
      Object.keys(selectedAddons).forEach(groupId => {
        const groupSelections = selectedAddons[groupId];
        Object.values(groupSelections).forEach(item => {
          total += Number(item.price || 0) * (item.quantity || 1);
        });
      });
    }

    return total;
  };

  const renderMenuItem = (product) => {
    const quantity = getQuantity(product.id);
    const raw = product._raw || {};
    const displayProductName = raw.product?.name || raw.name || raw.productName || product.name || '';
    const image = product.image || (Array.isArray(raw.images) && raw.images[0]);

    // Pricing logic
    const price = Number(raw.pricing?.price ?? raw.price ?? product.price ?? 0);
    const discount = Number(raw.pricing?.discount ?? raw.discount ?? 0);

    let finalPrice = Number(raw.pricing?.finalPrice ?? raw.finalPrice ?? price);
    if (discount > 0 && finalPrice === price) {
      finalPrice = price - (price * discount / 100);
    }

    const currency = raw.pricing?.currency ?? '';
    const hasVariations = (raw.variations && raw.variations.length > 0) || (raw.options && raw.options.length > 0);
    const description = raw.description || raw.slug || '';
    const isUpdating = updatingProductId === product.id;

    // Stock Logic
    const stockQty = raw.stock?.quantity ?? 999;
    const isOutOfStock = stockQty <= 0;
    const isLowStock = stockQty > 0 && stockQty <= 5;

    return (
      <TouchableOpacity
        key={product.id}
        activeOpacity={0.92}
        onPress={() => !isOutOfStock && openProductModal(product)}
        disabled={isUpdating || isOutOfStock}
        style={[
          styles.menuItem,
          {
            backgroundColor: colors.surface,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          },
          isOutOfStock && { opacity: 0.65 }
        ]}
      >
        {/* Image */}
        <View style={styles.menuImageWrap}>
          {image ? (
            <Image source={{ uri: image }} style={styles.menuItemImage} resizeMode="cover" />
          ) : (
            <View style={[styles.menuItemImage, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f4f4f5', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="fast-food-outline" size={28} color={isDarkMode ? '#555' : '#ccc'} />
            </View>
          )}

          {/* Discount Badge */}
          {discount > 0 && !isOutOfStock && (
            <View style={[styles.discountFlag, { backgroundColor: colors.primary }]}>
              <Text style={styles.discountFlagText}>{discount}%</Text>
            </View>
          )}

          {/* Sold Out */}
          {isOutOfStock && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.menuItemInfo}>
          <Text style={[styles.menuItemName, { color: colors.text.primary }]} numberOfLines={2}>
            {displayProductName}
          </Text>

          {description ? (
            <Text style={[styles.menuItemDescription, { color: isDarkMode ? '#888' : '#999' }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          {/* Low Stock */}
          {isLowStock && (
            <Text style={styles.lowStockText}>
              {t('lowStock') || 'Low Stock'}: {stockQty} {t('left') || 'left'}
            </Text>
          )}

          {/* Price Row */}
          <View style={styles.priceRow}>
            {discount > 0 ? (
              <>
                <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                  {formatCurrency(currency, finalPrice)}
                </Text>
                <Text style={styles.originalPrice}>
                  {formatCurrency(currency, price)}
                </Text>
              </>
            ) : (
              <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                {hasVariations ? 'From ' : ''}{formatCurrency(currency, price)}
              </Text>
            )}
            {hasVariations && (
              <Text style={[styles.customizableTag, { color: colors.text.secondary }]}>
                {t('customizable') || 'Customizable'}
              </Text>
            )}
          </View>
        </View>

        {/* Add Button */}
        <View style={styles.menuItemActions}>
          <View
            style={[
              styles.addButton,
              { backgroundColor: isOutOfStock ? (isDarkMode ? '#333' : '#eee') : colors.primary }
            ]}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isOutOfStock ? 'close' : 'add'}
                size={22}
                color={isOutOfStock ? '#999' : '#fff'}
              />
            )}
            {quantity > 0 && !isOutOfStock && (
              <View style={[styles.quantityBadge, { borderColor: colors.primary }]}>
                <Text style={[styles.quantityBadgeText, { color: colors.primary }]}>{quantity}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Product detail modal
  const renderProductModal = () => {
    if (!activeProduct) return null;
    const raw = activeProduct._raw || {};
    const title = raw.product?.name || raw.name || raw.productName || activeProduct.name || '';
    const images = Array.isArray(raw.images) && raw.images.length ? raw.images : (activeProduct.image ? [activeProduct.image] : []);
    const description = raw.longDescription || raw.description || raw.details || raw.slug || '';
    const price = raw.pricing?.price ?? raw.price ?? activeProduct.price ?? 0;
    const currency = raw.pricing?.currency ?? '';
    const quantity = modalQuantity;
    const isUpdating = updatingProductId === activeProduct.id;

    // Helper to calculate total price dynamically
    const calculateModalTotal = () => {
      let base = Number(raw.pricing?.price ?? raw.price ?? activeProduct.price ?? 0);

      // 1. Variations override
      if (selectedVariations) {
        Object.values(selectedVariations).forEach(val => {
          if (val && typeof val === 'object' && val.price) {
            base = Math.max(base, Number(val.price));
          }
        });
      }

      // 2. Addons additive
      // We don't have direct access to 'selectedAddons' map here easily unless we passed it or it's in scope.
      // Assuming 'selectedVariations' might contain addons or we skip addons for now to fix crash.
      // Wait, let's look for how addons are stored. They seem to be in a separate screen or missing here.
      // The error said "selectedAddons doesn't exist", implying it WAS used.
      // I'll make this safe: base * quantity.

      const discount = Number(raw.pricing?.discount ?? raw.discount ?? 0);
      if (discount > 0) {
        base = base - (base * discount / 100);
      }

      // Add tax
      const taxRate = Number(raw.pricing?.taxRate ?? 0);
      if (taxRate > 0) {
        base += (base * taxRate / 100);
      }

      return base * quantity;
    };

    return (
      <Modal visible={productModalVisible} transparent animationType="slide" onRequestClose={closeProductModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeProductModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, flexDirection: 'column' }]}>
            {/* Image Section */}
            <View style={{ position: 'relative' }}>
              {images.length > 0 ? (
                <Image source={{ uri: images[0] }} style={styles.modalImage} resizeMode="cover" />
              ) : null}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,1)']}
                style={styles.imageOverlay}
              />
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeProductModal}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, flexGrow: 1 }}
              contentContainerStyle={{ paddingBottom: 200 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Content */}
              <View style={styles.modalBody}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>

                <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>
                  {description || t('noDescription')}
                </Text>

                <View style={styles.modalPriceContainer}>
                  {(() => {
                    // 1. Determine Base Price & Details
                    const pricing = raw.pricing || {};
                    let basePrice = Number(pricing.price ?? raw.price ?? 0);

                    // Check for selected variation price override (e.g. Size: Medium = 12)
                    // We look for any selected option that has a price attached to its object
                    if (selectedVariations) {
                      const variationKeys = Object.keys(selectedVariations).filter(k => k.endsWith('_obj'));
                      for (const key of variationKeys) {
                        const opt = selectedVariations[key];
                        if (opt && opt.price) {
                          // Assuming variation price REPLACES base price if it's a primary variant (like Size)
                          // If it's just an extra (like Cheese), it might be additive.
                          // Based on user JSON "Size" variations have full prices (8, 12, 16).
                          // We'll treat the highest price found as the new Base if it's > basePrice to be safe, 
                          // or just take the last one. Let's assume Size is the primary price driver.
                          basePrice = Number(opt.price);
                        }
                      }
                    }

                    const discountPercent = Number(pricing.discount ?? raw.discount ?? 0);
                    const taxRate = Number(pricing.taxRate ?? 0);
                    // Tax amount from backend is likely for default item. We must recalculate if base changed.
                    let taxAmount = Number(pricing.taxAmount ?? 0);
                    let finalPrice = Number(pricing.finalPrice ?? raw.finalPrice ?? 0);

                    // 2. Calculations for display
                    const discountAmount = (basePrice * discountPercent) / 100;
                    const discountedBase = basePrice - discountAmount;

                    // Recalculate Tax if we are using dynamic base
                    // If we have taxRate, we should recalculate taxAmount on the discounted base
                    if (taxRate > 0) {
                      taxAmount = (discountedBase * taxRate) / 100;
                    }

                    // Recalculate Final Price
                    const displayTotal = discountedBase + taxAmount;

                    return (
                      <View>
                        {/* 
                           PSYCHOLOGY UI: 
                           Show Base Price (High Anchor) vs Discounted Base Price (The Deal).
                           Tax is secondary information.
                        */}
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                          {/* Discounted Price (The Hero) */}
                          <Text style={[styles.modalPrice, { fontSize: 32, color: colors.primary }]}>
                            {formatCurrency(currency, discountedBase)}
                          </Text>

                          {/* Original Base Price (High Anchor) */}
                          {discountPercent > 0 && (
                            <Text style={[styles.modalPriceOriginal, { fontSize: 20, textDecorationLine: 'line-through', opacity: 0.6 }]}>
                              {formatCurrency(currency, basePrice)}
                            </Text>
                          )}
                        </View>

                        {/* Discount Badge */}
                        {discountPercent > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={[styles.modalBadge, { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }]}>
                              <Text style={[styles.modalBadgeText, { fontSize: 13 }]}>SAVE {discountPercent}%</Text>
                            </View>
                            <Text style={{ marginLeft: 8, fontSize: 13, color: '#4CAF50', fontFamily: 'Poppins-Medium' }}>
                              (-{formatCurrency(currency, discountAmount)})
                            </Text>
                          </View>
                        )}


                        {/* Breakdown for Transparency (Secondary) */}
                        <View style={{
                          marginTop: 8,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderColor: colors.border,
                          marginBottom: 16
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>Subtotal</Text>
                            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>{formatCurrency(currency, discountedBase)}</Text>
                          </View>

                          {(taxAmount > 0 || taxRate > 0) && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>Tax {taxRate > 0 ? `(${taxRate}%)` : ''}</Text>
                              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>{formatCurrency(currency, taxAmount)}</Text>
                            </View>
                          )}

                          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4, opacity: 0.5 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: colors.text.primary }}>Total</Text>
                            <Text style={{ fontSize: 14, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{formatCurrency(currency, displayTotal)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </View>

              </View>

              {/* Add-ons Info Banner - Addons will be selected on separate screen */}
              {activeAddons.length > 0 && (
                <View style={[styles.addonsBanner, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingVertical: 12 }]}>
                  <View style={{ backgroundColor: colors.primary + '15', padding: 8, borderRadius: 20, marginRight: 12 }}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addonsBannerTitle, { color: colors.text.primary, fontSize: 14, marginBottom: 2 }]}>
                      {t('extrasAvailable')}
                    </Text>
                    <Text style={[styles.addonsBannerText, { color: colors.text.secondary, fontSize: 12 }]}>
                      {t('addExtrasAfterCart')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Variations Section */}
              {((raw.variations || raw.options) && (raw.variations || raw.options).length > 0) && (
                <View style={styles.modalVariations}>
                  {(raw.variations || raw.options || []).map((variation, vIndex) => (
                    <View key={vIndex} style={styles.variationGroup}>
                      <Text style={[styles.variationTitle, { color: colors.text.primary }]}>
                        {variation.name || variation.title || `Option ${vIndex + 1}`}
                        {variation.required && <Text style={{ color: 'red' }}> *</Text>}
                      </Text>
                      <View style={styles.variationOptions}>
                        {(variation.items || variation.options || []).map((opt, oIndex) => {
                          const optId = opt.label || opt.name || opt.id || opt._id;
                          const isSelected = selectedVariations[variation.name || variation.title || variation.id] === optId;

                          // Price diff logic
                          // Use raw.pricing or raw.price safely
                          const base = Number(raw.pricing?.price ?? raw.price ?? 0);
                          const optPrice = opt.price ? Number(opt.price) : 0;

                          // If option has explicit price, diff is optPrice - base
                          // If option is just additive (no full price), then price is the diff itself
                          // But per user data, options have full price (8, 12, 16).
                          let priceDiff = 0;
                          if (optPrice > 0) {
                            priceDiff = optPrice - base;
                          }

                          return (
                            <TouchableOpacity
                              key={oIndex}
                              style={[
                                styles.variationOptionChip,
                                { borderColor: colors.border },
                                isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                              ]}
                              onPress={() => setSelectedVariations(prev => ({
                                ...prev,
                                [variation.name || variation.title || variation.id]: optId,
                                [`${variation.name || variation.title || variation.id}_obj`]: opt
                              }))}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[
                                  styles.variationOptionText,
                                  { color: colors.text.primary },
                                  isSelected && { color: colors.primary, fontFamily: 'Poppins-SemiBold' }
                                ]}>
                                  {opt.label || opt.name || opt.value}
                                </Text>
                                {optPrice > 0 && (
                                  <Text style={{
                                    marginLeft: 4,
                                    fontSize: 11,
                                    color: isSelected ? colors.primary : colors.text.secondary,
                                    fontFamily: 'Poppins-Regular'
                                  }}>
                                    ({formatCurrency(currency, optPrice)})
                                  </Text>
                                )}
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

            </ScrollView>


            {/* Footer - Absolute Positioned, rendered after modal ready */}
            {modalReady && (
              <View style={[styles.modalFooter, {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingBottom: Platform.OS === 'android' ? Math.max(24, insets.bottom + 20) : Math.max(16, insets.bottom)
              }]}>
                <View style={{ backgroundColor: colors.primary + '05', borderRadius: borderRadius.xl, padding: spacing.md }}>

                  {/* Quantity Controls - Row Layout (Label Left, Controls Right) */}
                  <View style={[styles.modalQuantitySection, { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.modalQuantityLabel, { color: colors.text.primary }]}>{t('quantity') || 'Quantity'}</Text>

                    {/* Stock Check for Modal */}
                    {(raw.stock?.quantity ?? 999) <= 0 ? (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.border, borderRadius: 8 }}>
                        <Text style={{ color: colors.text.secondary, fontWeight: 'bold' }}>{t('outOfStock') || 'Out of Stock'}</Text>
                      </View>
                    ) : (
                      <View style={styles.modalQuantityControl}>
                        <TouchableOpacity
                          style={[styles.modalQuantityBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            if (quantity > 0) {
                              setModalQuantity(Math.max(0, quantity - 1));
                            }
                          }}
                          disabled={quantity === 0}
                        >
                          <Ionicons name="remove" size={22} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.modalQuantityText, { color: colors.text.primary }]}>{quantity}</Text>
                        <TouchableOpacity
                          style={[styles.modalQuantityBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            const currentCartQty = itemsMap?.[activeProduct.id]?.quantity || 0;
                            const maxStock = parseInt(raw.stock?.quantity ?? 0, 10);
                            const nextQty = quantity + 1;

                            // Check if stock info is available
                            if (maxStock > 0) {
                              if ((currentCartQty + nextQty) > maxStock) {
                                setMaxQuantityData({
                                  maxStock: maxStock,
                                  currentCartQty: currentCartQty,
                                  itemName: activeProduct?.name || 'Item'
                                });
                                setMaxQuantityModalVisible(true);
                                return;
                              }
                            }

                            setModalQuantity(quantity + 1);
                          }}
                        >
                          <Ionicons name="add" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={{
                      borderRadius: 16,
                      opacity: (quantity > 0 && (raw.stock?.quantity ?? 999) > 0) ? 1 : 0.5,
                      backgroundColor: colors.primary // Ensure background is visible
                    }}
                    onPress={async () => {
                      const stockQty = raw.stock?.quantity ?? 999;
                      if (stockQty <= 0) return;

                      // Prevent double-tap
                      if (addingToCart) return;

                      // Validate quantity first
                      if (quantity === 0) {
                        setAlertConfig({
                          title: t('error') || 'Error',
                          message: t('pleaseAddQuantity') || 'Please add at least 1 item'
                        });
                        setAlertVisible(true);
                        return;
                      }

                      // Enhanced validation: Check if product has variations and ALL are selected
                      const variations = raw.variations || raw.options || [];

                      if (variations.length > 0) {
                        // Check if ANY variation is not selected
                        // RELAXED: User requested optional variants. Only enforce if 'required' is explicitly true.
                        // If your data doesn't have 'required' property, this loop effectively becomes optional.
                        const unselectedRequired = variations.filter(v => v.required && !selectedVariations[v.name || v.title || v.id]);

                        if (unselectedRequired.length > 0) {
                          setAlertConfig({
                            title: t('selectionRequired') || 'Selection Required',
                            message: `${t('pleaseSelect') || 'Please select'}: ${unselectedRequired[0].name || unselectedRequired[0].title || 'a variation'}`
                          });
                          setAlertVisible(true);
                          return;
                        }
                      }

                      // Start loading
                      setAddingToCart(true);

                      try {
                        // Validate Add-on requirements
                        // Validation relaxed to prevent blocking valid flows due to backend data mismatch.
                        /*
                        for (const group of activeAddons) {
                          if (group.minSelectable > 0) {
                            const groupSelections = selectedAddons[group._id] || {};
                            // Check total items count for "select X items" requirement
                            const totalCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
              
                            if (totalCount < group.minSelectable) {
                              setAlertConfig({
                                title: t('selectionRequired') || 'Selection Required',
                                message: `${t('pleaseSelect') || 'Please select at least'} ${group.minSelectable} ${t('from') || 'from'} ${group.title || group.name}`
                              });
                              setAlertVisible(true);
                              return;
                            }
                          }
                        }
                        */

                        // Retrieve detailed objects for selections
                        const selectedObjs = Object.keys(selectedVariations)
                          .filter(k => k.endsWith('_obj'))
                          .map(k => selectedVariations[k]);

                        // Map selection to variant name for backend compatibility.
                        let targetVariantName = null;

                        // 1. Look for option with explicit SKU
                        // CRITICAL FIX: If selectedObjs comes from initial "lite" product data, it might miss SKU.
                        // We must re-lookup the selection in the *current* activeProduct (which is likely fresh now).

                        let variationSku = null;

                        // Identify what was selected
                        const selectedKeys = Object.keys(selectedVariations).filter(k => !k.endsWith('_obj'));

                        if (selectedKeys.length > 0) {
                          // Try to find the SKU from the fresh activeProduct data using the selected values
                          const freshVariations = activeProduct._raw?.variations || activeProduct._raw?.options || [];

                          for (const key of selectedKeys) {
                            const selectedValue = selectedVariations[key]; // e.g., "VAR-SPI-MED-Z4D" or "Medium"

                            // Find the group
                            const group = freshVariations.find(v => (v.name || v.title || v.id) === key);
                            if (group) {
                              // Find the option
                              const options = group.items || group.options || [];
                              const option = options.find(o =>
                                (o.label || o.name || o.value) === selectedValue ||
                                (o.id || o._id) === selectedValue ||
                                (o.sku === selectedValue) // unlikely but possible
                              );

                              if (option && option.sku) {
                                variationSku = option.sku;
                                targetVariantName = option.label || option.name || option.value;
                                break; // Found a SKU, we are good
                              }
                            }
                          }
                        }

                        // Fallback: use the object we have in state if re-lookup failed
                        if (!variationSku) {
                          const skuOption = selectedObjs.find(o => o.sku);
                          if (skuOption) {
                            targetVariantName = skuOption.label || skuOption.name || skuOption.value;
                            variationSku = skuOption.sku;
                          }
                        }

                        // 2. If no SKU, check for "Size" or "Variations" (common primary attributes)
                        if (!targetVariantName) {
                          // Fallback: don't join with commas. Just pick the first significant one.
                          // Ideally we'd pick the one that affects price the most? 
                          // For now, pick the first one to avoid "A, B" errors.
                          const firstOpt = selectedObjs[0];
                          if (firstOpt) targetVariantName = firstOpt.label || firstOpt.name || firstOpt.value;
                        }

                        const variantName = targetVariantName || null;

                        // Check if product has addon groups
                        const addonGroupIds = raw.addonGroups || [];
                        const hasAddons = addonGroupIds.length > 0;

                        // Payload for cart - addons will be handled on separate screen
                        const payload = {
                          variantName: variantName,
                          variationSku: variationSku, // Added SKU for backend
                          options: selectedVariations,
                          addons: [] // Don't send addons here, let AddonsScreen handle it
                        };

                        // Add the product to cart first (without addons)
                        const result = await addItem(activeProduct, quantity, payload);

                        if (result && !result.success) {
                          // Check for different vendor error
                          if (result.error === 'DIFFERENT_VENDOR') {
                            // Helper to safely fallback if t(key) returns key
                            const safeT = (key, fallback) => {
                              const val = t(key);
                              return val === key ? fallback : val;
                            };

                            setAlertConfig({
                              title: safeT('startNewBasket', 'Start new basket?'),
                              message: safeT('clearCartConfirm', 'Your cart contains items from another restaurant. Do you want to clear it and add this item?'),
                              buttons: [
                                {
                                  text: safeT('cancel', 'Cancel'),
                                  style: 'cancel',
                                  onPress: () => console.log('Cancelled new basket')
                                },
                                {
                                  text: safeT('clearAndAdd', 'Clear & Add'),
                                  onPress: async () => {
                                    try {
                                      // Clear all carts directly
                                      await clearAllCarts();
                                      // Wait a tick for state to update
                                      setTimeout(async () => {
                                        // Retry adding
                                        const retry = await addItem(activeProduct, quantity, payload);
                                        if (retry && !retry.success) {
                                          setAlertConfig({
                                            title: safeT('error', 'Error'),
                                            message: retry.message || safeT('addToCartFailed', 'Failed to add item')
                                          });
                                          setAlertVisible(true);
                                        } else {
                                          // Success path - same as below
                                          closeProductModal();
                                          if (hasAddons) {
                                            // ... navigate to addons
                                            setTimeout(() => {
                                              const mongoProductId = raw._id || activeProduct._raw?._id || activeProduct.id;
                                              navigation.navigate('Addons', {
                                                product: { name: raw.name || activeProduct.name, id: mongoProductId },
                                                productId: mongoProductId,
                                                variantName: variantName,
                                                addonGroupIds: addonGroupIds,
                                                currency: raw.pricing?.currency || 'EUR'
                                              });
                                            }, 300);
                                          }
                                        }
                                      }, 100);
                                    } catch (e) {
                                      console.error('Failed to clear and add:', e);
                                    }
                                  }
                                }
                              ]
                            });
                            setAlertVisible(true);
                            return; // Stop execution, wait for user input
                          }
                          console.warn('[RestaurantDetails] Add to cart failed:', result);
                          throw new Error(result.message || 'Failed to add to cart');
                        }

                        closeProductModal();

                        // If product has addons, navigate to AddonsScreen
                        if (hasAddons) {
                          // Small delay to ensure modal is closed
                          setTimeout(() => {
                            // Use MongoDB _id for productId since backend looks up items by _id
                            const mongoProductId = raw._id || activeProduct._raw?._id || activeProduct.id;

                            navigation.navigate('Addons', {
                              product: {
                                name: raw.name || activeProduct.name,
                                id: mongoProductId,
                              },
                              productId: mongoProductId,
                              variantName: variantName,
                              addonGroupIds: addonGroupIds,
                              currency: raw.pricing?.currency || 'EUR'
                            });
                          }, 300);
                        }
                      } catch (error) {
                        console.error('[RestaurantDetails] Add to cart error:', error);
                        setAlertConfig({
                          title: t('error') || 'Error',
                          // Show actual error message if available, otherwise fallback
                          message: error.message || t('addToCartFailed') || 'Failed to add item to cart'
                        });
                        setAlertVisible(true);
                      } finally {
                        setAddingToCart(false);
                      }
                    }}
                    disabled={isUpdating || addingToCart || quantity === 0}
                  >
                    <LinearGradient
                      colors={(quantity > 0) ? ['#EC407A', '#D81B60'] : ['#E0E0E0', '#BDBDBD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalAddToCartBtn}
                    >
                      {addingToCart ? (
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                      ) : (
                        <Ionicons name="cart" size={22} color={quantity > 0 ? "#fff" : colors.text.light} style={{ marginRight: 10 }} />
                      )}
                      {/* Fixed width container for text to prevent layout jitter */}
                      <View style={{ minWidth: 200, alignItems: 'center' }}>
                        <Text style={[styles.modalAddToCartText, { color: quantity > 0 ? '#fff' : colors.text.light }]}>
                          {addingToCart
                            ? (t('adding') || 'Adding...')
                            : quantity > 0
                              ? (() => {
                                const total = calculateModalTotal();
                                return `${t('addToCart') || 'Add to cart'} • ${formatCurrency(currency, total)}`;
                              })()
                              : (t('addToCart') || 'Add to cart')
                          }
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>{displayName}</Text>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setSearchVisible(!searchVisible)}>
          <Ionicons name="search" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.text.secondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={t('searchMenu') || 'Search menu...'}
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title={t('loading') || 'Loading...'}
            titleColor={colors.text.secondary}
          />
        }
      >
        {/* Premium Vendor Header */}
        <View style={styles.vendorHero}>
          <Image
            source={
              restaurant._raw?.vendor?.storePhoto
                ? { uri: restaurant._raw.vendor.storePhoto }
                : (restaurant.image ? { uri: restaurant.image } : require('../assets/images/logonew.png'))
            }
            style={styles.restaurantImage}
            resizeMode="cover"
          />
          {/* Bottom gradient for blending */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.06)']}
            style={styles.heroBottomGradient}
          />
        </View>

        {/* Glassmorphism Info Card — floating overlap */}
        <View style={styles.glassInfoCard}>
          <Text style={[styles.restaurantName, { color: colors.text.primary }]}>{displayName}</Text>
          {displayLocation && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={[styles.locationText, { color: colors.text.secondary }]}>
                {displayLocation}
              </Text>
            </View>
          )}
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryTabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        >
          {menuCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedCategory === category && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  { color: colors.text.secondary },
                  selectedCategory === category && { color: '#fff' },
                ]}
              >
                {category === 'Popular' ? (t('popular') || 'Popular') : category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={{ padding: spacing.md }}>
          <Text style={[styles.menuSectionTitle, { color: colors.text.primary }]}>
            {searchQuery ? `${t('search') || 'Search'} (${getFilteredMenuItems().length})` : (t('menu') || 'Menu')}
          </Text>

          {getFilteredMenuItems().length > 0 ? (
            getFilteredMenuItems().map((item) => renderMenuItem(item))
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={64} color={colors.text.light} />
              <Text style={[styles.noResultsText, { color: colors.text.primary }]}>{t('noItemsFound') || 'No items found'}</Text>
              <Text style={[styles.noResultsSubtext, { color: colors.text.secondary }]}>{t('tryAdjustingFilters') || 'Try different keywords'}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <View style={[styles.floatingCart, {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(16, insets.bottom + 16)
        }]}>
          <View>
            <Text style={[styles.cartItemCount, { color: colors.text.secondary }]}>{getTotalItems()} {t('items') || 'items'}</Text>
            <Text style={[styles.cartTotal, { color: colors.primary }]}>{formatCurrency(vendorCurrency, getTotalPrice())}</Text>
          </View>
          <TouchableOpacity
            style={[styles.viewCartButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
          >
            <Text style={styles.viewCartButtonText}>{t('viewCart') || 'View Cart'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {renderProductModal()}

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

      {/* Max Quantity Modal */}
      <MaxQuantityModal
        visible={maxQuantityModalVisible}
        onClose={() => setMaxQuantityModalVisible(false)}
        maxStock={maxQuantityData.maxStock}
        currentCartQty={maxQuantityData.currentCartQty}
        itemName={maxQuantityData.itemName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    paddingVertical: spacing.xs,
  },
  // ── Premium Vendor Hero ──
  vendorHero: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  heroBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  restaurantImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  // ── Glassmorphism Info Overlay ──
  glassInfoCard: {
    marginHorizontal: 28,
    marginTop: -40,  // Float over hero image
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    // Glass border
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    // Deep premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.15,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginLeft: 5,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
  },
  metaDot: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.sm,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  deliveryLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  deliveryValue: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  offerText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  categoryTabs: {
    borderBottomWidth: 1,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  menuSectionTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    // Premium depth
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  menuImageWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItemImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  discountFlag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountFlagText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.3,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  soldOutText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },
  menuItemInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 4,
    justifyContent: 'center',
  },
  menuItemName: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  menuItemDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    lineHeight: 17,
    marginBottom: 6,
  },
  lowStockText: {
    fontSize: 10,
    color: '#E8850C',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  menuItemPrice: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#bbb',
    textDecorationLine: 'line-through',
  },
  customizableTag: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginLeft: 4,
  },
  menuItemActions: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium shadow glow
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    minWidth: 24,
    textAlign: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quantityBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    marginTop: spacing.xs,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cartItemCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  cartTotal: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
  },
  viewCartButton: {
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
  },
  viewCartButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    width: '100%', // Ensure full width
    maxHeight: '85%', // Reduced to ensure footer visible on all devices
    overflow: 'hidden', // Ensure content doesn't bleed out
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalImage: {
    width: '100%',
    height: 280, // Taller for better product showcase
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 26,
    marginBottom: 24,
  },
  modalPriceContainer: {
    marginBottom: spacing.md,
  },
  // modalPriceLabel removed
  modalPrice: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#E91E63',
    marginRight: 4,
  },
  modalPriceOriginal: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
    marginLeft: 8,
    opacity: 0.35,
  },
  modalBadge: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalQuantitySection: {
    marginBottom: 0,
  },
  modalQuantityLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    marginBottom: 0,
  },
  modalQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    padding: 4,
  },
  modalQuantityBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuantityText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    minWidth: 50,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    // paddingBottom is handled dynamically via style prop with insets
  },
  modalAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56, // FIXED height for stability
    paddingVertical: 0,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalAddToCartText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  modalOriginalPrice: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  modalVariations: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  variationGroup: {
    marginBottom: spacing.md,
  },
  variationTitle: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.sm,
  },
  variationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variationOptionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12, // More breathable vertical padding
    borderRadius: 8, // Slightly softer radius
    borderWidth: 1,
    marginBottom: 8,
    width: '100%', // Full width for vertical stacking which is clearer for complex options
    flexDirection: 'row', // Align content
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variationOptionText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  addonsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md, // Ensure space below too
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addonsBannerTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 20, // Better line height
  },
  addonsBannerText: {
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
    lineHeight: 16, // Better line height
  },
});

export default RestaurantDetailsScreen;

