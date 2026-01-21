/**
 * RestaurantDetailsScreen - Modern Foodpanda-inspired UI
 * Professional restaurant menu with enhanced product modal
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useProducts } from '../contexts/ProductsContext';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import formatCurrency from '../utils/currency';
import * as Location from 'expo-location';
import AlertModal from '../components/AlertModal';
import { fetchAddonGroups } from '../utils/addonApi';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { restaurant } = route.params;
  const insets = useSafeAreaInsets();

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
  const { addItem, updateQuantity: cartUpdateQuantity, itemsMap } = useCart();

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Optimistic local quantity state
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

  const [selectedVariations, setSelectedVariations] = useState({});

  // Add-ons state
  const [activeAddons, setActiveAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState({}); // { groupId: { optionId: optionObj } }

  const openProductModal = (product) => {
    setActiveProduct(product);
    setSelectedVariations({});
    // Reset quantity to 1 for fresh addition
    setLocalQty((prev) => ({ ...prev, [product.id]: 1 }));

    // Reset add-ons
    setActiveAddons([]);
    setSelectedAddons({});
    setProductModalVisible(true);

    // Fetch add-ons if present
    const rawProduct = product._raw || product;
    if (rawProduct.addonGroups && rawProduct.addonGroups.length > 0) {
      setLoadingAddons(true);
      fetchAddonGroups(rawProduct.addonGroups)
        .then(groups => {
          // Filter active groups. The API might return { data: group } or just group
          const processedGroups = groups.map(g => g.data || g).filter(g => !g.isDeleted);
          setActiveAddons(processedGroups);
        })
        .catch(err => console.error('Failed to load add-ons', err))
        .finally(() => setLoadingAddons(false));
    }
  };

  const closeProductModal = () => {
    setActiveProduct(null);
    setProductModalVisible(false);
  };

  // Use ProductsContext
  const { products: allProducts, fetchRestaurantMenu } = useProducts();

  // Determine vendorId using robust check
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

  // Local state for menu products - filtered initial from global, then updated via explicit fetch
  // HYBRID: Start with cache so user sees something, then update with fresh data
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

  // --- Reverse Geocoding for Location in Header ---
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
    if (raw.subCategory) derivedCategories.add(raw.subCategory);
    else if (raw.category) derivedCategories.add(raw.category);
    else if (Array.isArray(p.categories) && p.categories.length) p.categories.forEach(c => derivedCategories.add(c));
  });
  const menuCategories = ['All', 'Popular', ...Array.from(derivedCategories)];

  // Fetch menu on focus - ALWAYS get fresh data from API
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalQty((prev) => ({ ...prev, [item.id]: current + 1 }));
    setUpdatingProductId(item.id);
    await addItem(item, 1, options);
    setTimeout(() => setUpdatingProductId(null), 250);
  };

  const removeFromCart = async (item) => {
    const current = getQuantity(item.id);
    if (current <= 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    // Use finalPrice if available to respect discounts
    // Use backend totals if available, otherwise calculate
    let itemTotal = 0;
    if (it.subtotal !== undefined && it.subtotal !== null) {
      itemTotal = Number(it.subtotal);
      console.log(`[RestaurantDetails] Using backend subtotal for ${it.product?.name}: ${itemTotal}`);
    } else {
      const basePrice = Number(it.product.finalPrice ?? it.product.price ?? 0);
      const addonsTotal = (it.addons || []).reduce((sum, ad) => sum + Number(ad.price || 0), 0);
      itemTotal = (basePrice + addonsTotal) * it.quantity;
      console.log(`[RestaurantDetails] Calc fallback for ${it.product?.name}: base=${basePrice}, addons=${addonsTotal}, qty=${it.quantity} -> ${itemTotal}`);
      console.log('DEBUG itemsMap entry:', JSON.stringify(it, null, 2));
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

  const renderMenuItem = (product) => {
    const quantity = getQuantity(product.id);
    const raw = product._raw || {};
    const displayProductName = raw.product?.name || raw.name || raw.productName || product.name || '';
    const image = product.image || (Array.isArray(raw.images) && raw.images[0]);

    // Pricing logic
    const price = raw.pricing?.price ?? raw.price ?? product.price ?? 0;
    const finalPrice = raw.pricing?.finalPrice ?? raw.finalPrice ?? price;
    const discount = raw.pricing?.discount ?? raw.discount ?? 0;
    const currency = raw.pricing?.currency ?? '';

    // Logic for variations
    const hasVariations = (raw.variations && raw.variations.length > 0) || (raw.options && raw.options.length > 0);
    const description = raw.description || raw.slug || '';
    const isUpdating = updatingProductId === product.id;

    return (
      <View
        key={product.id}
        style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Left: tap to open modal */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => openProductModal(product)}
          style={styles.menuItemContent}
          disabled={isUpdating}
        >
          {image ? (
            <View>
              <Image source={{ uri: image }} style={styles.menuItemImage} />
              {discount > 0 && (
                <View style={[styles.discountBadgeAbsolute, { backgroundColor: colors.primary, position: 'absolute', top: 0, left: 0, paddingHorizontal: 4, paddingVertical: 2, borderBottomRightRadius: 8 }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{discount}%</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.menuItemImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="fast-food" size={32} color={colors.text.secondary} />
              {discount > 0 && (
                <View style={[styles.discountBadgeAbsolute, { backgroundColor: colors.primary, position: 'absolute', top: 0, left: 0, paddingHorizontal: 4, paddingVertical: 2, borderBottomRightRadius: 8 }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{discount}%</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.menuItemInfo}>
            <Text style={[styles.menuItemName, { color: colors.text.primary }]} numberOfLines={2}>{displayProductName}</Text>
            {description ? (
              <Text style={[styles.menuItemDescription, { color: colors.text.secondary }]} numberOfLines={2}>{description}</Text>
            ) : null}

            <View style={{ marginTop: 4 }}>
              {discount > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.menuItemPrice, { color: colors.primary, marginRight: 6 }]}>
                    {formatCurrency(currency, finalPrice)}
                  </Text>
                  <Text style={[styles.menuItemOriginalPrice, { color: colors.text.light, textDecorationLine: 'line-through', fontSize: 12 }]}>
                    {formatCurrency(currency, price)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                  {hasVariations ? 'From ' : ''}{formatCurrency(currency, price)}
                </Text>
              )}
              {hasVariations && <Text style={{ fontSize: 10, color: colors.text.secondary, marginTop: 2 }}>{t('customizable') || 'Customizable'}</Text>}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Add button - always opens modal */}
        <View style={styles.menuItemActions} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => openProductModal(product)}
            disabled={isUpdating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#fff" />
                {quantity > 0 && (
                  <View style={[styles.quantityBadge, { backgroundColor: '#fff' }]}>
                    <Text style={[styles.quantityBadgeText, { color: colors.primary }]}>{quantity}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    const quantity = getQuantity(activeProduct.id);
    const isUpdating = updatingProductId === activeProduct.id;

    return (
      <Modal visible={productModalVisible} transparent animationType="slide" onRequestClose={closeProductModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeProductModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Close Button */}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeProductModal}>
                <Ionicons name="close-circle" size={32} color={colors.text.secondary} />
              </TouchableOpacity>

              {/* Images */}
              {images.length > 0 && (
                <Image source={{ uri: images[0] }} style={styles.modalImage} resizeMode="cover" />
              )}

              {/* Content */}
              <View style={styles.modalBody}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>

                {description && (
                  <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>{description}</Text>
                )}

                <View style={[styles.modalPriceRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalPriceLabel, { color: colors.text.secondary }]}>{t('price') || 'Price'}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    {(raw.pricing?.discount > 0 || raw.discount > 0) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[styles.modalOriginalPrice, { color: colors.text.light, textDecorationLine: 'line-through', marginRight: 8 }]}>
                          {formatCurrency(currency, raw.pricing?.price || raw.price || price)}
                        </Text>
                        <View style={[styles.discountBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.discountText}>{raw.pricing?.discount || raw.discount}% OFF</Text>
                        </View>
                      </View>
                    )}
                    <Text style={[styles.modalPrice, { color: colors.primary }]}>
                      {formatCurrency(currency, (() => {
                        // Calculate live total price including add-ons
                        const base = raw.pricing?.finalPrice || raw.finalPrice || price;

                        // Add-on prices
                        let addonTotal = 0;
                        Object.values(selectedAddons).forEach(groupSelections => {
                          Object.values(groupSelections).forEach(opt => {
                            if (opt.price) addonTotal += Number(opt.price);
                          });
                        });

                        return base + addonTotal;
                      })())}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Add-ons Section */}
              {loadingAddons ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ marginTop: 8, color: colors.text.secondary, fontSize: 12 }}>{t('loadingAddons') || 'Loading add-ons...'}</Text>
                </View>
              ) : (
                activeAddons.map((group) => {
                  const isMultiSelect = group.maxSelectable !== 1;
                  return (
                    <View key={group._id} style={styles.variationGroup}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.variationTitle, { color: colors.text.primary, marginBottom: 0 }]}>
                          {group.title || group.name}
                          {group.minSelectable > 0 && <Text style={{ color: 'red' }}> *</Text>}
                        </Text>
                        {group.maxSelectable > 0 && (
                          <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>
                              {group.maxSelectable === 1
                                ? (t('pick1') || 'Pick 1')
                                : `${t('upto') || 'Up to'} ${group.maxSelectable}`
                              }
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'column' }}>
                        {(group.options || []).map((opt) => {
                          const isSelected = !!selectedAddons[group._id]?.[opt._id];
                          return (
                            <TouchableOpacity
                              key={opt._id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 12,
                                paddingHorizontal: 4,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border + '40', // lighter separator
                              }}
                              onPress={() => {
                                setSelectedAddons(prev => {
                                  const groupSelections = prev[group._id] || {};
                                  const newGroupSelections = { ...groupSelections };

                                  if (isSelected) {
                                    // Deselect
                                    delete newGroupSelections[opt._id];
                                  } else {
                                    // Select logic based on maxSelectable
                                    const currentCount = Object.keys(groupSelections).length;

                                    if (group.maxSelectable === 1) {
                                      // Radio behavior: clear others, set this one
                                      return {
                                        ...prev,
                                        [group._id]: { [opt._id]: opt }
                                      };
                                    } else if (group.maxSelectable > 1) {
                                      // Multi-select with limit
                                      if (currentCount < group.maxSelectable) {
                                        newGroupSelections[opt._id] = opt;
                                      } else {
                                        // Limit reached - ignore
                                        return prev; // Or show toast?
                                      }
                                    } else {
                                      // No limit
                                      newGroupSelections[opt._id] = opt;
                                    }
                                  }

                                  return {
                                    ...prev,
                                    [group._id]: newGroupSelections
                                  };
                                });
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Ionicons
                                  name={isMultiSelect
                                    ? (isSelected ? "checkbox" : "square-outline")
                                    : (isSelected ? "radio-button-on" : "radio-button-off")
                                  }
                                  size={22}
                                  color={isSelected ? colors.primary : colors.text.light}
                                  style={{ marginRight: 12 }}
                                />
                                <Text style={{
                                  fontSize: 14,
                                  fontFamily: isSelected ? 'Poppins-SemiBold' : 'Poppins-Regular',
                                  color: isSelected ? colors.text.primary : colors.text.secondary,
                                  flex: 1
                                }}>
                                  {opt.name}
                                </Text>
                              </View>
                              {(opt.price > 0) && (
                                <Text style={{
                                  fontSize: 14,
                                  fontFamily: 'Poppins-Medium',
                                  color: isSelected ? colors.primary : colors.text.primary
                                }}>
                                  +{formatCurrency(currency, opt.price)}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
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
                          // Robust ID check - prefer label as ID if ID missing since extraction needs label
                          const optId = opt.label || opt.name || opt.id || opt._id;
                          const isSelected = selectedVariations[variation.name || variation.title || variation.id] === optId;
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
                              <Text style={[
                                styles.variationOptionText,
                                { color: colors.text.primary },
                                isSelected && { color: colors.primary, fontFamily: 'Poppins-SemiBold' }
                              ]}>
                                {opt.label || opt.name || opt.value}
                                {(opt.price && opt.price > 0) ? ` (+${formatCurrency(currency, opt.price)})` : ''}
                              </Text>
                              {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Quantity Controls */}
              <View style={styles.modalQuantitySection}>
                <Text style={[styles.modalQuantityLabel, { color: colors.text.primary }]}>{t('quantity') || 'Quantity'}</Text>
                <View style={[styles.modalQuantityControl, { borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.modalQuantityBtn, { backgroundColor: quantity > 0 ? colors.background : colors.border }]}
                    onPress={() => {
                      if (quantity > 0) {
                        setLocalQty(prev => ({ ...prev, [activeProduct.id]: Math.max(0, quantity - 1) }));
                      }
                    }}
                    disabled={quantity === 0}
                  >
                    <Ionicons name="remove" size={20} color={quantity > 0 ? colors.primary : colors.text.light} />
                  </TouchableOpacity>
                  <Text style={[styles.modalQuantityText, { color: colors.text.primary }]}>{quantity}</Text>
                  <TouchableOpacity
                    style={[styles.modalQuantityBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setLocalQty(prev => ({ ...prev, [activeProduct.id]: quantity + 1 }));
                    }}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.modalAddToCartBtn,
                  {
                    backgroundColor: quantity > 0 ? colors.primary : colors.border,
                    opacity: quantity > 0 ? 1 : 0.5
                  }
                ]}
                onPress={async () => {
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
                    const unselected = variations.filter(v => !selectedVariations[v.name || v.title || v.id]);

                    if (unselected.length > 0) {
                      setAlertConfig({
                        title: t('selectionRequired') || 'Selection Required',
                        message: `${t('pleaseSelect') || 'Please select'}: ${unselected[0].name || unselected[0].title || 'a variation'}`
                      });
                      setAlertVisible(true);
                      return;
                    }
                  }

                  // Validate Add-on requirements
                  for (const group of activeAddons) {
                    if (group.minSelectable > 0) {
                      const selectedCount = selectedAddons[group._id] ? Object.keys(selectedAddons[group._id]).length : 0;
                      if (selectedCount < group.minSelectable) {
                        setAlertConfig({
                          title: t('selectionRequired') || 'Selection Required',
                          message: `${t('pleaseSelectAtLeast') || 'Please select at least'} ${group.minSelectable} ${t('from') || 'from'} ${group.title || group.name}`
                        });
                        setAlertVisible(true);
                        return;
                      }
                    }
                  }

                  // Retrieve detailed objects for selections
                  const variantNames = Object.keys(selectedVariations)
                    .filter(k => k.endsWith('_obj'))
                    .map(k => {
                      const opt = selectedVariations[k];
                      // Prioritize clean name/value over label if possible, to avoid price suffixes
                      // If only label exists, try to strip price suffix like " (+€9.00)"
                      let val = opt.name || opt.value || opt.id || opt.label;
                      if (val && typeof val === 'string' && val.includes(' (+')) {
                        val = val.split(' (+')[0];
                      }
                      return val;
                    });

                  // Fallback if no objects stored
                  const finalLabels = variantNames.length > 0 ? variantNames : Object.keys(selectedVariations)
                    .filter(k => !k.endsWith('_obj'))
                    .map(k => selectedVariations[k]);

                  // Construct variantName string
                  const variantName = finalLabels.join(', ');

                  // Prepare Add-ons for payload
                  const addonsPayload = [];

                  Object.values(selectedAddons).forEach(groupSelections => {
                    Object.values(groupSelections).forEach(opt => {
                      addonsPayload.push({
                        addonId: opt._id || opt.id || opt.uuid,
                        quantity: 1
                      });
                    });
                  });


                  const payload = {
                    variantName: variantName || 'Standard',
                    options: selectedVariations,
                    addons: addonsPayload
                  };

                  // Add to cart with the selected quantity
                  await addItem(activeProduct, quantity, payload);
                  closeProductModal();
                }}
                disabled={isUpdating || quantity === 0}
              >
                <Ionicons name="cart" size={20} color={quantity > 0 ? "#fff" : colors.text.light} style={{ marginRight: 8 }} />
                <Text style={[styles.modalAddToCartText, { color: quantity > 0 ? '#fff' : colors.text.light }]}>
                  {quantity > 0
                    ? (() => {
                      const base = raw.pricing?.finalPrice || raw.finalPrice || price;
                      let addonTotal = 0;
                      Object.values(selectedAddons).forEach(groupSelections => {
                        Object.values(groupSelections).forEach(opt => {
                          if (opt.price) addonTotal += Number(opt.price);
                        });
                      });
                      const total = (base + addonTotal) * quantity;
                      return `${t('add') || 'Add'} ${quantity} ${t('for') || 'for'} ${formatCurrency(currency, total)}`;
                    })()
                    : (t('addToCart') || 'Add to cart')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View >
        </View >
      </Modal >
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
        {/* Vendor Section - Show only vendor name and image */}
        <View style={[styles.restaurantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image
            source={
              restaurant._raw?.vendor?.storePhoto
                ? { uri: restaurant._raw.vendor.storePhoto }
                : (restaurant.image ? { uri: restaurant.image } : require('../assets/images/logonew.png'))
            }
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantInfo}>
            <Text style={[styles.restaurantName, { color: colors.text.primary }]}>{displayName}</Text>
            {displayLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                <Text style={{ color: colors.text.secondary, fontSize: 13, fontFamily: 'Poppins-Regular', marginLeft: 4 }}>
                  {displayLocation}
                </Text>
              </View>
            )}
          </View>
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
        onClose={() => setAlertVisible(false)}
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
  restaurantCard: {
    margin: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
  },
  restaurantInfo: {
    padding: spacing.md,
  },
  restaurantName: {
    fontSize: fontSize.xxl,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.xs,
  },
  restaurantCategories: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    marginBottom: spacing.sm,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  menuItemContent: {
    flexDirection: 'row',
    flex: 1,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  menuItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.xs,
  },
  menuItemDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    marginBottom: spacing.xs,
  },
  menuItemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
  menuItemActions: {
    marginLeft: spacing.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  modalPriceLabel: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
  },
  modalPrice: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
  },
  modalQuantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalQuantityLabel: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
  modalQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  modalQuantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuantityText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    minWidth: 32,
    textAlign: 'center',
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  modalAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalAddToCartText: {
    color: '#fff',
    fontSize: fontSize.lg,
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
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  variationOptionText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
});

export default RestaurantDetailsScreen;

