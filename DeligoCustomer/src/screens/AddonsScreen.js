import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Animated, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { fetchAddonGroups } from '../utils/addonApi';
import CartAPI from '../utils/cartApi';
import formatCurrency from '../utils/currency';
import Toast from 'react-native-toast-message';

/**
 * AddonsScreen
 * 
 * Manages product customization via addons and modifiers.
 * Features:
 * - Dynamic fetching of addon groups based on product configuration.
 * - Enforcement of selection rules (Single vs Multi-select, min/max limits).
 * - Real-time price calculation updates.
 * - Direct integration with CartContext for modifying line items.
 * - "Industry Standard" UI Design with sticky footer and polished controls.
 * 
 * @param {Object} props
 * @param {Object} props.route - Route parameters containing product context.
 * @param {Object} props.navigation - Navigation controller.
 */
const AddonsScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { fetchCart, addItem } = useCart();
  const insets = useSafeAreaInsets();

  // Params from navigation
  const {
    product,           // The product that was added to cart
    productId,         // Product ID used in cart
    variantName,       // Selected variant name
    variationSku,      // Selected variation SKU
    addonGroupIds,     // Array of addon group IDs to fetch
    currency = 'EUR'
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addonGroups, setAddonGroups] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState({}); // { groupId: { optionId: { ...opt, quantity } } }

  // Bring cart context in
  const { cart } = useCart();

  // Shimmer animation for button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  // Fetch addon groups on mount
  useEffect(() => {
    const loadAddons = async () => {
      if (!addonGroupIds || addonGroupIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const groups = await fetchAddonGroups(addonGroupIds);
        const processedGroups = groups
          .map(g => g.data || g)
          .filter(g => g && !g.isDeleted && (g.isActive !== false));

        // Filter out inactive options within groups
        const activeGroups = processedGroups.map(g => ({
          ...g,
          options: (g.options || []).filter(opt => opt.isActive !== false)
        }));

        setAddonGroups(activeGroups);
      } catch (error) {
        console.error('[AddonsScreen] Failed to load addons:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAddons();
  }, [addonGroupIds]);

  // Helper: Calculate price with tax
  const getPriceWithTax = (opt) => {
    const basePrice = Number(opt.price || 0);
    const taxRate = opt.tax?.taxRate ? Number(opt.tax.taxRate) : 0;
    const taxAmount = basePrice * (taxRate / 100);
    return basePrice + taxAmount;
  };

  // Calculate total addon price (inclusive of tax)
  const calculateAddonTotal = () => {
    let total = 0;
    Object.values(selectedAddons).forEach(groupSelections => {
      Object.values(groupSelections).forEach(opt => {
        if (opt.price) {
          total += getPriceWithTax(opt) * (opt.quantity || 1);
        }
      });
    });
    return total;
  };

  // Calculate just the tax amount
  const calculateTaxTotal = () => {
    let totalTax = 0;
    Object.values(selectedAddons).forEach(groupSelections => {
      Object.values(groupSelections).forEach(opt => {
        if (opt.price) {
          const basePrice = Number(opt.price || 0);
          const taxRate = opt.tax?.taxRate ? Number(opt.tax.taxRate) : 0;
          const taxAmount = basePrice * (taxRate / 100);
          totalTax += taxAmount * (opt.quantity || 1);
        }
      });
    });
    return totalTax;
  };

  // ... inside render loop ...



  // Handle addon selection toggle
  const toggleAddon = (group, opt) => {
    setSelectedAddons(prev => {
      const groupSelections = prev[group._id] || {};
      const newGroupSelections = { ...groupSelections };
      const isSelected = !!newGroupSelections[opt._id];

      if (group.maxSelectable === 1) {
        // Radio behavior - select this, deselect others
        if (isSelected) {
          // Typically radio buttons don't uncheck on tap, but we allow it if optional
          if (group.minSelectable === 0) {
            delete newGroupSelections[opt._id];
          }
        } else {
          // Clear other selections in this group for radio behavior
          return { ...prev, [group._id]: { [opt._id]: { ...opt, quantity: 1 } } };
        }
      } else {
        // Multi behavior
        if (isSelected) {
          delete newGroupSelections[opt._id];
        } else {
          const currentTotalCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
          if (group.maxSelectable > 1 && currentTotalCount >= group.maxSelectable) {
            Toast.show({
              type: 'error',
              text1: t('limitReached') || 'Limit Reached',
              text2: `${t('youCanOnlySelect') || 'You can only select'} ${group.maxSelectable} ${t('options') || 'options'}`
            });
            return prev;
          }
          newGroupSelections[opt._id] = { ...opt, quantity: 1 };
        }
      }
      return { ...prev, [group._id]: newGroupSelections };
    });
  };

  // Handle addon quantity change
  const updateAddonQuantity = (group, opt, delta) => {
    setSelectedAddons(prev => {
      const groupSelections = prev[group._id] || {};
      const existing = groupSelections[opt._id];
      if (!existing) return prev;

      const newQty = (existing.quantity || 1) + delta;
      const newGroupSelections = { ...groupSelections };

      if (newQty <= 0) {
        delete newGroupSelections[opt._id];
      } else {
        // Check max limit for multi-select
        if (delta > 0 && group.maxSelectable > 1) {
          const totalCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
          if (totalCount >= group.maxSelectable) {
            Toast.show({
              type: 'error',
              text1: t('limitReached') || 'Limit Reached',
              text2: `${t('youCanOnlySelect') || 'You can only select'} ${group.maxSelectable} ${t('options') || 'options'}`
            });
            return prev;
          }
        }
        newGroupSelections[opt._id] = { ...existing, quantity: newQty };
      }

      return { ...prev, [group._id]: newGroupSelections };
    });
  };

  // Save addons to cart via API
  const handleSaveAddons = async () => {
    // Attempt auto-recovery of variationSku if missing
    let resolvedVariationSku = variationSku;
    if (!resolvedVariationSku && productId && cart) {
      const cartItem = (cart.items || []).find(i => String(i.productId?._id || i.productId) === String(productId));
      if (cartItem && cartItem.variationSku) {
        resolvedVariationSku = cartItem.variationSku;
      } else {
        // If we can't find it directly, try checking raw cart format
        const rawItems = cart.items ? Object.values(cart.items) : [];
        const matched = rawItems.find(i => i.productId === productId || i.id === productId);
        if (matched && matched.variationSku) {
          resolvedVariationSku = matched.variationSku;
        }
      }
    }

    // Validate required groups
    for (const group of addonGroups) {
      if (group.minSelectable > 0) {
        const groupSelections = selectedAddons[group._id] || {};
        const totalCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
        if (totalCount < group.minSelectable) {
          // Improve validation feedback? For now, we rely on the button likely not being disabled logic or just alert?
          // Ideally, we should disable the button until valid.
          // For now, let's just alert/log and return.
          // Or better, we can proceed but logic usually prevents this if we disable button.
          // Let's rely on button state (which we'll implement below).
        }
      }
    }

    // Build list of addon updates
    const addonUpdates = [];
    Object.values(selectedAddons).forEach(groupSelections => {
      Object.values(groupSelections).forEach(opt => {
        if (opt._id && opt.quantity > 0) {
          addonUpdates.push({
            addonId: opt._id,
            optionId: opt._id, // Backward compat
            quantity: opt.quantity, // We'll loop this many times for the API call 
            name: opt.name,
            price: opt.price,
            sku: opt.sku || opt._id || opt.id || 'N/A'
          });
        }
      });
    });

    if (addonUpdates.length === 0 && !route.params?.isNewItem) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {

      // IF THIS IS A BRAND NEW ITEM: 2-step flow
      // Step 1 → Add product to cart (no addons)
      // Step 2 → Call update-addon-quantity for each selected addon
      if (route.params?.isNewItem) {
        const addPayload = {
          variantName: variantName === null ? undefined : (variantName || undefined),
          variationSku: route.params?.variationSku || undefined,
          options: route.params?.options || {},
          // NOTE: Do NOT pass addons here — backend ignores them in addToCart.
          // Addons are added separately via update-addon-quantity below.
        };

        // ── STEP 1: Add product to cart ──
        const result = await addItem(
          product,
          route.params?.quantity || 1,
          addPayload
        );

        if (result && !result.success) {
          setSaving(false);
          let displayTitle = t('actionFailed');
          if (displayTitle === 'actionFailed') displayTitle = 'Action Failed';

          let displayMessage = result.message || result.error || 'Failed to add item to cart';
          if (typeof displayMessage === 'object') displayMessage = JSON.stringify(displayMessage);

          Alert.alert(displayTitle, displayMessage, [{ text: 'OK' }]);
          return;
        }

        // ── STEP 2: Add each addon via update-addon-quantity ──
        // Resolve the clean MongoDB _id to send to backend.
        // route.params.productId is the most reliable — it's the explicit Mongo _id
        // passed by the ProductDetailScreen when navigating here.
        const cleanProductId =
          (typeof productId === 'string' && /^[0-9a-fA-F]{24}$/.test(productId) ? productId : null) ||
          product?._raw?._id ||
          product?._id ||
          product?.id;

        console.log('[AddonsScreen] Step 2 — using productId for addon update:', cleanProductId);

        const resolvedSkuForAddon = route.params?.variationSku || undefined;

        if (addonUpdates.length > 0) {
          let addonHasError = false;
          let addonErrorMessage = '';
          let addonRawError = null;

          for (const addon of addonUpdates) {
            // Backend adds 1 per call, so loop quantity times
            for (let i = 0; i < addon.quantity; i++) {
              const res = await CartAPI.updateAddonQuantity(
                cleanProductId,
                undefined,           // variantName not needed by backend
                addon.optionId,      // option _id
                'increment',
                resolvedSkuForAddon, // variationSku (undefined if no variation)
                addon.sku
              );

              if (res && !res.success) {
                addonHasError = true;
                addonErrorMessage = res.error?.message || res.error || 'Failed to add addon';
                addonRawError = res.rawResponse || res.error;
                break;
              }
            }
            if (addonHasError) break;
          }

          if (addonHasError) {
            setSaving(false);
            // Product was added but addon failed — still fetch updated cart
            await fetchCart({ force: true }).catch(() => { });

            let displayMessage = addonErrorMessage;
            if (typeof displayMessage === 'object' && displayMessage !== null) {
              displayMessage = displayMessage.message || displayMessage.error || JSON.stringify(displayMessage);
            }
            if (typeof displayMessage !== 'string') displayMessage = String(displayMessage);

            console.warn('[AddonsScreen] Addon step failed after product add:', displayMessage);

            Toast.show({
              type: 'error',
              position: 'top',
              topOffset: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
              visibilityTime: 4000,
              text1: t('error') !== 'error' ? t('error') : 'Addon Error',
              text2: displayMessage,
            });
            // Don't navigate back — let user retry or skip
            return;
          }
        }

        // Both steps succeeded
        console.log('[AddonsScreen] Product + addons saved successfully');
        await fetchCart({ force: true }).catch(() => { });
        Toast.show({ type: 'success', text1: t('addedToCart') || 'Added to cart!' });
        navigation.goBack();
        return;
      }


      let hasError = false;
      let errorMessage = '';
      let rawResponseError = null;

      // Call update-addon-quantity API for each addon unit
      for (const addon of addonUpdates) {
        for (let i = 0; i < addon.quantity; i++) {
          const res = await CartAPI.updateAddonQuantity(
            productId,
            variantName === null ? undefined : (variantName || 'Standard'),
            addon.optionId,
            'increment',
            resolvedVariationSku === null ? undefined : resolvedVariationSku,
            addon.sku
          );

          if (res && !res.success) {
            hasError = true;
            errorMessage = res.error?.message || res.error || 'Failed to update addon';
            rawResponseError = res.rawResponse || res.error;
            break;
          }
        }
        if (hasError) break;
      }

      if (hasError) {
        setSaving(false);

        if (rawResponseError) {
          Alert.alert(
            'Backend Validation Error',
            JSON.stringify(rawResponseError, null, 2),
            [{ text: 'OK' }]
          );
        }

        let displayTitle = t('actionFailed');
        if (displayTitle === 'actionFailed') displayTitle = t('error') !== 'error' ? t('error') : 'Action Failed';

        // Deep extraction of error message to handle arrays, objects, and nested messages
        let displayMessage = errorMessage;
        if (typeof displayMessage === 'object' && displayMessage !== null) {
          if (Array.isArray(displayMessage)) {
            displayMessage = displayMessage.map(err => typeof err === 'object' ? (err.msg || err.message || JSON.stringify(err)) : err).join(', ');
          } else {
            displayMessage = displayMessage.message || displayMessage.error || displayMessage.msg || JSON.stringify(displayMessage);
          }
        }
        if (typeof displayMessage !== 'string') {
          displayMessage = String(displayMessage);
        }

        // Sometimes backend returns "Validation Error" as main message but details are inside the object. Check if there was a deeper error
        if (displayMessage === 'Validation Error' || displayMessage === 'Bad Request') {
          displayMessage = 'Please ensure your selection meets all requirements (stock/limits).';
        }

        if (displayMessage.includes('Maximum selection limit')) {
          displayMessage = t('limitReached') !== 'limitReached'
            ? t('limitReached')
            : 'Maximum selection limit reached for this item.';
        }

        console.error('\\n==== ADDON VALIDATION ERROR ====');
        console.error('Title:', displayTitle);
        console.error('Parsed Message:', displayMessage);
        console.error('Original Error Object:', JSON.stringify(errorMessage, null, 2));
        console.error('================================\\n');

        Toast.show({
          type: 'error',
          position: 'top',
          topOffset: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
          visibilityTime: 4000,
          text1: displayTitle,
          text2: displayMessage
        });
        await fetchCart({ force: true }).catch(() => { });
        return; // Don't go back, stay on screen so user can correct
      }

      console.log('[AddonsScreen] Successfully added addons');
      await fetchCart({ force: true });
      navigation.goBack();
    } catch (error) {
      console.error('[AddonsScreen] Failed to save addons:', error);
      await fetchCart({ force: true }).catch(() => { });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // If this is a new item (not yet in cart), we must add the product
    // even when skipping addons — otherwise nothing gets added to cart!
    if (route.params?.isNewItem) {
      setSaving(true);
      try {
        const addPayload = {
          variantName: variantName === null ? undefined : (variantName || undefined),
          variationSku: route.params?.variationSku || undefined,
          options: route.params?.options || {},
        };

        const result = await addItem(
          product,
          route.params?.quantity || 1,
          addPayload
        );

        if (result && !result.success) {
          let displayMessage = result.message || result.error || 'Failed to add item to cart';
          if (typeof displayMessage === 'object') displayMessage = JSON.stringify(displayMessage);
          Alert.alert('Error', displayMessage, [{ text: 'OK' }]);
          return; // Stay on screen if add failed
        }

        Toast.show({ type: 'success', text1: t('addedToCart') || 'Added to cart!' });
      } catch (e) {
        console.error('[AddonsScreen] Skip-add failed:', e);
      } finally {
        setSaving(false);
      }
    }
    navigation.goBack();
  };

  // Calculate Base Product Price (handling variations)
  const productPriceInfo = useMemo(() => {
    if (!product) return { base: 0, discounted: 0, tax: 0, total: 0 };

    const pricing = product.pricing || {};
    let base = Number(pricing.price ?? product.price ?? 0);

    // Check if a variation override exists from route params
    if (variationSku) {
      // Find variation price in product options
      const variations = product.variations || product.options || [];
      for (const grp of variations) {
        const opt = (grp.items || grp.options || []).find(o => o.sku === variationSku || o.name === variantName);
        if (opt && opt.price) {
          base = Math.max(base, Number(opt.price));
          break;
        }
      }
    }

    const discountPercent = Number(pricing.discount ?? product.discount ?? 0);
    let discounted = base;
    if (discountPercent > 0) {
      discounted = base - (base * discountPercent / 100);
    }

    const taxRate = Number(pricing.taxRate ?? product.taxRate ?? 0);
    const tax = (discounted * taxRate) / 100;

    return {
      base,
      discounted,
      tax,
      total: discounted + tax
    };
  }, [product, variationSku, variantName]);

  const addonTotal = calculateAddonTotal();
  const addonTaxTotal = calculateTaxTotal();

  const finalQuantity = Number(route.params?.quantity || 1);
  const itemTotal = productPriceInfo.total * finalQuantity;
  const grandTotal = itemTotal + addonTotal;

  // Validation Check for "Continue" button
  const isValid = addonGroups.every(group => {
    if (group.minSelectable > 0) {
      const selections = selectedAddons[group._id] || {};
      const count = Object.values(selections).reduce((s, o) => s + (o.quantity || 0), 0);
      return count >= group.minSelectable;
    }
    return true;
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{t('loadingAddons') || 'Loading options...'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* ═══════ PREMIUM HEADER — Gradient accent ═══════ */}
      <View style={[styles.headerContainer]}>
        <LinearGradient
          colors={isDarkMode ? ['#1A0A15', '#1A0A15'] : ['#FFF5F8', '#FFE8F0']}
          style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12, borderBottomWidth: 0 }]}
        >
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('customize') || 'Customize'}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
              {product?.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={saving}>
            <Text style={[styles.skipButtonText, { color: saving ? colors.text.light : colors.primary }]}>{t('skip') || 'Skip'}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* PRICE SUMMARY CARD */}
        <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#22111A' : '#FFF9FB', borderColor: colors.primary + '20' }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('itemSubtotal') || 'Item Subtotal'} ({finalQuantity}x)</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{formatCurrency(currency, itemTotal)}</Text>
          </View>
          {addonTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('addons') || 'Add-ons'}</Text>
              <Text style={[styles.summaryValue, { color: colors.text.primary }]}>+{formatCurrency(currency, addonTotal)}</Text>
            </View>
          )}
          <View style={[styles.summaryDivider, { backgroundColor: colors.primary + '15' }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}>{t('total') || 'Total'}</Text>
            <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>{formatCurrency(currency, grandTotal)}</Text>
          </View>
        </View>

        {addonGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="food-variant-off" size={48} color={colors.text.disabled} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {t('noOptionsAvailable') || 'No options available for this item'}
            </Text>
          </View>
        ) : (
          addonGroups.map((group) => {
            const isMultiSelect = group.maxSelectable !== 1;
            const required = group.minSelectable > 0;
            const groupSelections = selectedAddons[group._id] || {};
            const currentCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
            const satisfied = required ? currentCount >= group.minSelectable : true;

            return (
              <View key={group._id} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupTitle, { color: colors.text.primary }]}>
                      {group.title || group.name}
                    </Text>
                    {group.description ? (
                      <Text style={[styles.groupDesc, { color: colors.text.secondary }]}>{group.description}</Text>
                    ) : null}
                  </View>

                  {/* Badge: Required/Optional */}
                  <View style={[styles.badge, {
                    backgroundColor: required
                      ? (satisfied ? '#E8F5E9' : '#FFEBEE')
                      : colors.background === '#FFFFFF' ? '#F3F4F6' : '#333'
                  }]}>
                    <Text style={[styles.badgeText, {
                      color: required
                        ? (satisfied ? '#2E7D32' : '#C62828')
                        : colors.text.secondary
                    }]}>
                      {required
                        ? (satisfied ? (t('completed') || 'COMPLETED') : (t('required') || 'REQUIRED'))
                        : (t('optional') || 'OPTIONAL')}
                    </Text>
                  </View>
                </View>

                {/* Constraint Text */}
                <Text style={[styles.constraintText, { color: colors.text.light }]}>
                  {group.maxSelectable > 1
                    ? `${t('selectUpTo') || 'Select up to'} ${group.maxSelectable}`
                    : (t('selectOne') || 'Select 1')}
                </Text>

                {/* Options List */}
                <View style={[styles.optionsList]}>
                  {(group.options || []).map((opt) => {
                    const isSelected = !!groupSelections[opt._id];

                    return (
                      <TouchableOpacity
                        key={opt._id}
                        style={[styles.optionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                        onPress={() => toggleAddon(group, opt)}
                        activeOpacity={0.6}
                      >
                        <View style={styles.optionLeft}>
                          {/* Control Icon or Quantity Controls */}
                          <View style={{ marginRight: 12 }}>
                            {isSelected ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    updateAddonQuantity(group, opt, -1);
                                  }}
                                  style={{ padding: 4 }}
                                >
                                  <MaterialCommunityIcons name="minus-circle-outline" size={24} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={{ marginHorizontal: 8, fontSize: 16, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>
                                  {groupSelections[opt._id].quantity || 1}
                                </Text>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    updateAddonQuantity(group, opt, 1);
                                  }}
                                  style={{ padding: 4 }}
                                >
                                  <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              isMultiSelect ? (
                                <MaterialCommunityIcons
                                  name="checkbox-blank-outline"
                                  size={24}
                                  color={colors.text.light}
                                />
                              ) : (
                                <Ionicons
                                  name="radio-button-off"
                                  size={24}
                                  color={colors.text.light}
                                />
                              )
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[
                              styles.optionName,
                              { color: isSelected ? colors.text.primary : colors.text.secondary, fontWeight: isSelected ? '600' : '400' }
                            ]}>
                              {opt.name}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.optionRight}>
                          {opt.price > 0 && (
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.optionPrice, { color: isSelected ? colors.text.primary : colors.text.secondary }]}>
                                +{formatCurrency(currency, getPriceWithTax(opt) * (isSelected ? (groupSelections[opt._id].quantity || 1) : 1))}
                              </Text>
                              {opt.tax?.taxRate > 0 && (
                                <Text style={{ fontSize: 10, color: colors.text.light, fontFamily: 'Poppins-Regular' }}>
                                  ({opt.tax.taxRate}% {t('tax') || 'Tax'})
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.footer, {
        backgroundColor: colors.surface,
        borderTopColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
        paddingBottom: Platform.OS === 'android' ? Math.max(18, insets.bottom + 10) : Math.max(14, insets.bottom),
      }]}>
        <TouchableOpacity
          style={{ opacity: isValid ? 1 : 0.4, borderRadius: 16, overflow: 'hidden' }}
          onPress={handleSaveAddons}
          disabled={saving || !isValid}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={isValid ? ['#DC3173', '#A8154E'] : ['#CCCCCC', '#BBBBBB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 54,
              paddingHorizontal: 20,
            }}
          >
            {/* Shimmer sweep overlay */}
            {isValid && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 60,
                  transform: [{
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, Dimensions.get('window').width + 100],
                    }),
                  }],
                }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            )}

            {saving ? (
              <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
            ) : null}

            <Text style={[styles.actionButtonText, { marginRight: 8, marginBottom: Platform.OS === 'ios' ? 0 : 2 }]}>
              {grandTotal > 0
                ? `${t('addToOrder') || 'Add to Order'} • ${formatCurrency(currency, grandTotal)}`
                : (t('saveContinu') || 'Save & Continue')}
            </Text>

            {!saving && isValid && (
              <View style={{
                width: 30,
                height: 30,
                backgroundColor: '#fff',
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="arrow-forward" size={18} color="#A8154E" style={{ marginLeft: 2 }} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginTop: 12,
    textAlign: 'center',
  },
  // Summary Card Styles
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 10,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 1, // subtle shadow for Android
    shadowColor: '#000', // subtle shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  groupHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  groupDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    lineHeight: 18,
  },
  constraintText: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
  },
  optionsList: {
    borderTopWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  optionName: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 999,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taxText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
});

export default AddonsScreen;
