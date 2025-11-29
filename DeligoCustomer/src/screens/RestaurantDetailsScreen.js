import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useProducts } from '../contexts/ProductsContext';

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { restaurant } = route.params;
  // Normalize rating to a scalar (number) to avoid rendering an object in <Text>
  const _r = restaurant || {};
  let ratingValue = null;
  if (_r.rating !== undefined && _r.rating !== null) {
    if (typeof _r.rating === 'number') ratingValue = _r.rating;
    else if (typeof _r.rating === 'object' && typeof _r.rating.average === 'number') ratingValue = _r.rating.average;
  }
  if ((ratingValue === null || ratingValue === undefined) && _r.vendor && typeof _r.vendor.rating === 'number') {
    ratingValue = _r.vendor.rating;
  }

  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [cart, setCart] = useState({});
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Product modal state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Handlers to open/close modal so setters are used
  const openProductModal = (product) => {
    setActiveProduct(product);
    setProductModalVisible(true);
  };

  const closeProductModal = () => {
    setActiveProduct(null);
    setProductModalVisible(false);
  };

  // compute numeric modal image width (90% of screen) so Image gets explicit dimensions
  const screenWidth = Dimensions.get('window').width;
  const modalImageWidth = Math.round(screenWidth * 0.9);

  // small helper component to show image with loader and error fallback
  const ModalImage = ({ uri, style }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: error ? '#f2f2f2' : undefined }]}>
        {!error && (
          <Image
            source={{ uri }}
            style={[{ width: style.width, height: style.height }]}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
          />
        )}
        {loading && !error && (
          <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute' }} />
        )}
        {error && (
          <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Image not available</Text>
        )}
      </View>
    );
  };

  // Use ProductsContext and show only items belonging to this vendor
  const { products: allProducts } = useProducts();

  // Prefer product name from multiple possible locations; fallback to vendor name
  const displayName = (
    restaurant?.name || restaurant?._raw?.name || restaurant?._raw?.product?.name || restaurant?.name || restaurant?._raw?.productName || restaurant?._raw?.vendor?.vendorName || 'Restaurant'
  );

  const vendorId = (
    restaurant?._raw?.vendor?.vendorId || restaurant?.vendor?.vendorId || restaurant?.vendorId || restaurant?._raw?.vendorId || null
  );

  // Filter products that belong to this vendor
  const vendorProducts = (allProducts || []).filter((p) => {
    const rawVendorId = p?._raw?.vendor?.vendorId || p?.vendor?.vendorId || p?.vendorId || null;
    return rawVendorId && vendorId && String(rawVendorId) === String(vendorId);
  });

  // Derive menu categories for tabs (Popular + unique subCategory/category)
  const derivedCategories = new Set();
  vendorProducts.forEach((p) => {
    const raw = p._raw || {};
    if (raw.subCategory) derivedCategories.add(raw.subCategory);
    else if (raw.category) derivedCategories.add(raw.category);
    else if (Array.isArray(p.categories) && p.categories.length) p.categories.forEach(c => derivedCategories.add(c));
  });
  const menuCategories = ['Popular', ...Array.from(derivedCategories)];

  const addToCart = (item) => {
    setCart({
      ...cart,
      [item.id]: (cart[item.id] || 0) + 1,
    });
  };

  const removeFromCart = (item) => {
    if (cart[item.id] > 0) {
      const newCart = { ...cart };
      newCart[item.id] -= 1;
      if (newCart[item.id] === 0) {
        delete newCart[item.id];
      }
      setCart(newCart);
    }
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    let total = 0;
    Object.keys(cart).forEach((itemId) => {
      const product = vendorProducts.find(p => p.id === itemId);
      const raw = product?._raw || {};
      const price = raw.pricing?.price ?? raw.price ?? product?.price ?? 0;
      if (price) total += Number(price) * cart[itemId];
    });
    return total.toFixed(2);
  };

  // Filter menu items based on search query
  const getFilteredMenuItems = () => {
    let items = vendorProducts;
    // filter by selectedCategory if not Popular
    if (selectedCategory && selectedCategory !== 'Popular') {
      items = items.filter((p) => {
        const raw = p._raw || {};
        const cat = raw.subCategory || raw.category || (Array.isArray(p.categories) && p.categories[0]) || '';
        return String(cat) === String(selectedCategory);
      });
    } else if (selectedCategory === 'Popular') {
      // Popular => meta.isFeatured === true or fallback to all
      const popular = items.filter(p => (p._raw?.meta && p._raw.meta.isFeatured) || p._raw?.isFeatured);
      if (popular.length) items = popular;
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      // Prefer product-specific name fields from the raw payload to avoid showing vendorName
      const rawItem = item._raw || {};
      const itemName = (rawItem.product?.name || rawItem.name || rawItem.productName || item.name || '').toLowerCase();
      const desc = (rawItem.description || rawItem.slug || '').toLowerCase();
      return itemName.includes(q) || desc.includes(q);
    });
  };

  const renderMenuItem = (product) => {
    const quantity = cart[product.id] || 0;
    const raw = product._raw || {};
    // Prefer product-level name fields to avoid showing vendorName which may have been stored in product.name during normalization
    const displayProductName = raw.product?.name || raw.name || raw.productName || product.name || '';
    const image = product.image || (Array.isArray(raw.images) && raw.images[0]);
    const price = raw.pricing?.price ?? raw.price ?? product.price ?? 0;
    const description = raw.description || raw.slug || '';

    return (
      <View key={product.id} style={styles(colors).menuItem}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => openProductModal(product)} style={styles(colors).menuItemLeft}>
          {image ? (
            <Image source={{ uri: image }} style={{ width: 64, height: 48, marginRight: spacing.md, borderRadius: 8 }} />
          ) : (
            <Text style={styles(colors).menuItemImage}>🍽</Text>
          )}

          <View style={styles(colors).menuItemInfo}>
            <Text style={styles(colors).menuItemName}>{displayProductName || (product.name || raw.name)}</Text>
            <Text style={styles(colors).menuItemDescription} numberOfLines={2}>
              {description}
            </Text>
            <Text style={styles(colors).menuItemPrice}>{raw.pricing?.currency ?? ''} {price ? Number(price).toFixed(2) : '0.00'}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles(colors).menuItemRight}>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles(colors).addButton}
              onPress={() => addToCart(product)}
            >
              <Text style={styles(colors).addButtonText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles(colors).quantityControl}>
              <TouchableOpacity
                style={styles(colors).quantityButton}
                onPress={() => removeFromCart(product)}
              >
                <Text style={styles(colors).quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles(colors).quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles(colors).quantityButton}
                onPress={() => addToCart(product)}
              >
                <Text style={styles(colors).quantityButtonText}>+</Text>
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
    const productId = raw.productId || raw._id || activeProduct.id || '';
    const sku = raw.sku || '';
    const description = raw.longDescription || raw.description || raw.details || raw.slug || '';
    const category = raw.category || '';
    const subCategory = raw.subCategory || '';
    const brand = raw.brand || '';
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const attributes = raw.attributes || {};
    const price = raw.pricing?.price ?? raw.price ?? activeProduct.price ?? 0;
    const currency = raw.pricing?.currency ?? '';

    return (
      <Modal visible={productModalVisible} transparent animationType="slide" onRequestClose={closeProductModal}>
        <View style={styles(colors).modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={closeProductModal} />
          <View style={styles(colors).modalCard}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {images.length ? (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles(colors).carousel, { width: modalImageWidth }]} contentContainerStyle={{ width: modalImageWidth * images.length }}>
                  {images.map((uri, i) => (
                    <ModalImage key={i} uri={uri} style={{ width: modalImageWidth, height: 240 }} />
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles(colors).modalBody}>
                <View style={styles(colors).modalHeaderRow}>
                  <Text style={styles(colors).modalTitle}>{title}</Text>
                  <Text style={styles(colors).modalPriceInline}>{currency} {price ? Number(price).toFixed(2) : '0.00'}</Text>
                </View>

                <View style={styles(colors).metaRow}>
                  {productId ? <Text style={styles(colors).metaSmall}>ID: {productId}</Text> : null}
                  {sku ? <Text style={[styles(colors).metaSmall, { marginLeft: 12 }]}>SKU: {sku}</Text> : null}
                </View>

                <View style={styles(colors).metaRow}>
                  {category ? <Text style={styles(colors).metaChip}>{category}</Text> : null}
                  {subCategory ? <Text style={[styles(colors).metaChip, { marginLeft: 8 }]}>{subCategory}</Text> : null}
                  {brand ? <Text style={[styles(colors).metaChip, { marginLeft: 8 }]}>{brand}</Text> : null}
                </View>

                {tags && tags.length ? (
                  <View style={styles(colors).tagsRow}>
                    {tags.map(t => (
                      <View key={t} style={styles(colors).tagChip}><Text style={styles(colors).tagText}>{t}</Text></View>
                    ))}
                  </View>
                ) : null}

                {description ? <Text style={styles(colors).modalDescription}>{description}</Text> : null}

                {attributes && Object.keys(attributes).length ? (
                  <View style={styles(colors).attributesContainer}>
                    <Text style={styles(colors).attributesTitle}>Details</Text>
                    <View style={styles(colors).attributesList}>
                      {Object.entries(attributes).map(([k, v]) => (
                        <View key={k} style={styles(colors).attributeRow}>
                          <Text style={styles(colors).attributeKey}>{k}</Text>
                          <Text style={styles(colors).attributeValue}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles(colors).modalActions}>
                  <TouchableOpacity style={styles(colors).modalCloseButton} onPress={closeProductModal}>
                    <Text style={styles(colors).modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles(colors).modalAddButton} onPress={() => { addToCart(activeProduct); closeProductModal(); }}>
                    <Text style={styles(colors).modalAddButtonText}>Add to cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container} edges={['top']}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>{displayName}</Text>
        <TouchableOpacity
          style={styles(colors).searchButton}
          onPress={() => setSearchVisible(!searchVisible)}
        >
          <Ionicons name="search" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles(colors).searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.secondary} style={styles(colors).searchIcon} />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search menu items..."
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

      <ScrollView style={styles(colors).scrollView} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles(colors).restaurantInfo}>
          <View style={styles(colors).restaurantHeader}>
            <Image
              source={
                restaurant.image
                  ? { uri: restaurant.image }
                  : (restaurant._raw?.vendor?.storePhoto ? { uri: restaurant._raw.vendor.storePhoto } : require('../assets/images/logonew.png'))
              }
              style={styles(colors).restaurantIconImage}
            />
            <View style={styles(colors).restaurantDetails}>
              <Text style={styles(colors).restaurantName}>{displayName}</Text>
              <Text style={styles(colors).restaurantCategories}>
                {(restaurant.categories && restaurant.categories.length) ? restaurant.categories.join(' • ') : (restaurant._raw?.tags ? restaurant._raw.tags.join(' • ') : '')}
              </Text>
               <View style={styles(colors).restaurantMeta}>
                 <View style={styles(colors).metaItem}>
                   <Text style={styles(colors).metaIcon}>⭐</Text>
                   <Text style={styles(colors).metaText}>{ratingValue !== null ? ratingValue : 'N/A'}</Text>
                 </View>
                <View style={styles(colors).metaItem}>
                  <Text style={styles(colors).metaIcon}>🕐</Text>
                  <Text style={styles(colors).metaText}>{restaurant.deliveryTime}</Text>
                </View>
                <View style={styles(colors).metaItem}>
                  <Text style={styles(colors).metaIcon}>📍</Text>
                  <Text style={styles(colors).metaText}>{restaurant.distance}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles(colors).deliveryInfo}>
            <View style={styles(colors).deliveryInfoItem}>
              <Text style={styles(colors).deliveryInfoLabel}>Delivery Fee</Text>
              <Text style={styles(colors).deliveryInfoValue}>{restaurant.deliveryFee}</Text>
            </View>
            {restaurant.offer && (
              <View style={styles(colors).offerBadge}>
                <Text style={styles(colors).offerText}>{restaurant.offer}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles(colors).categoryTabs}
          contentContainerStyle={styles(colors).categoryTabsContent}
        >
          {menuCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles(colors).categoryTab,
                selectedCategory === category && styles(colors).categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles(colors).categoryTabText,
                  selectedCategory === category && styles(colors).categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles(colors).menuSection}>
          <Text style={styles(colors).menuSectionTitle}>
            {searchQuery ? `Search Results (${getFilteredMenuItems().length})` : 'Menu'}
          </Text>
          {getFilteredMenuItems().length > 0 ? (
            getFilteredMenuItems().map((item) => renderMenuItem(item))
          ) : (
             <View style={styles(colors).noResultsContainer}>
               <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
               <Text style={styles(colors).noResultsText}>No items found</Text>
               <Text style={styles(colors).noResultsSubtext}>Try searching with different keywords</Text>
             </View>
           )}
        </View>

        {/* Cart Footer - Inside ScrollView */}
        {getTotalItems() > 0 && (
          <View style={styles(colors).cartFooterInline}>
            <View style={styles(colors).cartFooterLeft}>
              <Text style={styles(colors).cartItemCount}>{getTotalItems()} items</Text>
              <Text style={styles(colors).cartTotal}>€{getTotalPrice()}</Text>
            </View>
            <TouchableOpacity
              style={styles(colors).viewCartButton}
              onPress={() => {
                // Navigate back to Main navigator and switch to Cart tab
                navigation.navigate('Main', { screen: 'Cart' });
              }}
            >
              <Text style={styles(colors).viewCartButtonText}>View Cart</Text>
              <Text style={styles(colors).viewCartButtonIcon}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing for tab bar + safe area */}
        <View style={{ height: Math.max(80, insets.bottom + 80) }} />
      </ScrollView>

      {renderProductModal && renderProductModal()}
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  restaurantInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  restaurantIconImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
    backgroundColor: colors.border,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  restaurantCategories: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deliveryInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryInfoLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  deliveryInfoValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  offerBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  offerText: {
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
  categoryTabs: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTabText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  categoryTabTextActive: {
    color: colors.text.white,
  },
  menuSection: {
    padding: spacing.md,
  },
  menuSectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.md,
  },
  menuItemImage: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  menuItemDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  menuItemPrice: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  menuItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  quantityText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginHorizontal: spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  cartFooterInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartFooterLeft: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.white,
    opacity: 0.9,
  },
  cartTotal: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.white,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewCartButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  viewCartButtonIcon: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  noResultsText: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  // Product detail modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  carousel: {
    width: '100%',
    height: 240,
  },
  modalImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  modalBody: {
    padding: spacing.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    flex: 1,
  },
  modalPriceInline: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    marginLeft: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaSmall: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  metaChip: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tagChip: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  modalDescription: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  attributesContainer: {
    marginBottom: spacing.md,
  },
  attributesTitle: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  attributesList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  attributeKey: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  attributeValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalCloseButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButtonText: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
  },
});

export default RestaurantDetailsScreen;
