/**
 * RestaurantDetailsScreen - Modern Foodpanda-inspired UI
 * Professional restaurant menu with enhanced product modal
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useProducts } from '../contexts/ProductsContext';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import formatCurrency from '../utils/currency';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
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

  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addItem, updateQuantity: cartUpdateQuantity, itemsMap } = useCart();

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

  const openProductModal = (product) => {
    setActiveProduct(product);
    setProductModalVisible(true);
  };

  const closeProductModal = () => {
    setActiveProduct(null);
    setProductModalVisible(false);
  };

  // Use ProductsContext
  const { products: allProducts } = useProducts();

  const displayName = (
    restaurant?.name || restaurant?._raw?.name || restaurant?._raw?.product?.name || restaurant?._raw?.productName || restaurant?._raw?.vendor?.vendorName || 'Restaurant'
  );

  const vendorId = (
    restaurant?._raw?.vendor?.vendorId || restaurant?.vendor?.vendorId || restaurant?.vendorId || restaurant?._raw?.vendorId || null
  );

  // Filter products that belong to this vendor
  const vendorProducts = (allProducts || []).filter((p) => {
    const rawVendorId = p?._raw?.vendor?.vendorId || p?.vendor?.vendorId || p?.vendorId || null;
    return rawVendorId && vendorId && String(rawVendorId) === String(vendorId);
  });

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
  const menuCategories = ['Popular', ...Array.from(derivedCategories)];

  // Update add/remove with optimistic updates and animation
  const addToCart = async (item) => {
    const current = getQuantity(item.id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalQty((prev) => ({ ...prev, [item.id]: current + 1 }));
    setUpdatingProductId(item.id);
    await addItem(item, 1);
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
    const vendorIdOfItem = it.product.vendorId || it.product._raw?.vendor?.vendorId;
    if (vendorIdOfItem && vendorIdOfItem === vendorId) return s + (Number(it.product.price || 0) * it.quantity);
    return s;
  }, 0);

  // Filter menu items
  const getFilteredMenuItems = () => {
    let items = vendorProducts;
    if (selectedCategory && selectedCategory !== 'Popular') {
      items = items.filter((p) => {
        const raw = p._raw || {};
        const cat = raw.subCategory || raw.category || (Array.isArray(p.categories) && p.categories[0]) || '';
        return String(cat) === String(selectedCategory);
      });
    } else if (selectedCategory === 'Popular') {
      const popular = items.filter(p => (p._raw?.meta && p._raw.meta.isFeatured) || p._raw?.isFeatured);
      if (popular.length) items = popular;
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
    const price = raw.pricing?.price ?? raw.price ?? product.price ?? 0;
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
            <Image source={{ uri: image }} style={styles.menuItemImage} />
          ) : (
            <View style={[styles.menuItemImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="fast-food" size={32} color={colors.text.secondary} />
            </View>
          )}

          <View style={styles.menuItemInfo}>
            <Text style={[styles.menuItemName, { color: colors.text.primary }]} numberOfLines={2}>{displayProductName}</Text>
            {description && (
              <Text style={[styles.menuItemDescription, { color: colors.text.secondary }]} numberOfLines={2}>{description}</Text>
            )}
            <Text style={[styles.menuItemPrice, { color: colors.primary }]}>{formatCurrency(raw.pricing?.currency ?? '', price)}</Text>
          </View>
        </TouchableOpacity>

        {/* Right: quantity control */}
        <View style={styles.menuItemActions} pointerEvents="box-none">
          {quantity === 0 ? (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => addToCart(product)}
              disabled={isUpdating}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.quantityControl, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: quantity > 0 ? colors.background : colors.border }]}
                onPress={() => removeFromCart(product)}
                disabled={quantity === 0 || isUpdating}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={quantity > 0 ? colors.primary : colors.text.light} />
                ) : (
                  <Ionicons name="remove" size={16} color={quantity > 0 ? colors.primary : colors.text.light} />
                )}
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: colors.text.primary }]}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: colors.primary }]}
                onPress={() => addToCart(product)}
                disabled={isUpdating}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
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
                  <Text style={[styles.modalPriceLabel, { color: colors.text.secondary }]}>Price</Text>
                  <Text style={[styles.modalPrice, { color: colors.primary }]}>{formatCurrency(currency, price)}</Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.modalQuantitySection}>
                  <Text style={[styles.modalQuantityLabel, { color: colors.text.primary }]}>Quantity</Text>
                  <View style={[styles.modalQuantityControl, { borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.modalQuantityBtn, { backgroundColor: quantity > 0 ? colors.background : colors.border }]}
                      onPress={() => quantity > 0 && removeFromCart(activeProduct)}
                      disabled={quantity === 0 || isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={quantity > 0 ? colors.primary : colors.text.light} />
                      ) : (
                        <Ionicons name="remove" size={20} color={quantity > 0 ? colors.primary : colors.text.light} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.modalQuantityText, { color: colors.text.primary }]}>{quantity}</Text>
                    <TouchableOpacity
                      style={[styles.modalQuantityBtn, { backgroundColor: colors.primary }]}
                      onPress={() => addToCart(activeProduct)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="add" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalAddToCartBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (quantity === 0) addToCart(activeProduct);
                  closeProductModal();
                }}
                disabled={isUpdating}
              >
                <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalAddToCartText}>
                  {quantity > 0 ? `${quantity} in cart` : 'Add to cart'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

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
            placeholder={t('search') || 'Search menu...'}
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info Card */}
        <View style={[styles.restaurantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image
            source={
              restaurant.image
                ? { uri: restaurant.image }
                : (restaurant._raw?.vendor?.storePhoto ? { uri: restaurant._raw.vendor.storePhoto } : require('../assets/images/logonew.png'))
            }
            style={styles.restaurantImage}
          />

          <View style={styles.restaurantInfo}>
            <Text style={[styles.restaurantName, { color: colors.text.primary }]}>{displayName}</Text>
            <Text style={[styles.restaurantCategories, { color: colors.text.secondary }]}>
              {(restaurant.categories && restaurant.categories.length) ? restaurant.categories.join(' • ') : (restaurant._raw?.tags ? restaurant._raw.tags.join(' • ') : '')}
            </Text>

            <View style={styles.restaurantMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={16} color="#FFA000" />
                <Text style={[styles.metaText, { color: colors.text.primary }]}> {ratingValue !== null ? ratingValue : 'N/A'}</Text>
              </View>
              <Text style={[styles.metaDot, { color: colors.text.light }]}>•</Text>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                <Text style={[styles.metaText, { color: colors.text.primary }]}> {restaurant.deliveryTime}</Text>
              </View>
              <Text style={[styles.metaDot, { color: colors.text.light }]}>•</Text>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                <Text style={[styles.metaText, { color: colors.text.primary }]}> {restaurant.distance}</Text>
              </View>
            </View>

            {/* Delivery Info */}
            <View style={[styles.deliveryInfo, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="bike-fast" size={18} color={colors.primary} />
                <Text style={[styles.deliveryLabel, { color: colors.text.secondary }]}> {t('deliveryFee') || 'Delivery'}</Text>
              </View>
              <Text style={[styles.deliveryValue, { color: colors.primary }]}>{restaurant.deliveryFee}</Text>
            </View>

            {restaurant.offer && (
              <View style={[styles.offerBadge, { backgroundColor: colors.success || '#4CAF50' }]}>
                <Ionicons name="pricetag" size={14} color="#fff" />
                <Text style={styles.offerText}> {restaurant.offer}</Text>
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
                {category}
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
        <View style={[styles.floatingCart, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
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
});

export default RestaurantDetailsScreen;

