import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { fetchAddonGroups } from '../utils/addonApi';
import CartAPI from '../utils/cartApi';
import formatCurrency from '../utils/currency';

/**
 * AddonsScreen
 * 
 * Manages product customization via addons and modifiers.
 * Features:
 * - Dynamic fetching of addon groups based on product configuration.
 * - Enforcement of selection rules (Single vs Multi-select, min/max limits).
 * - Real-time price calculation updates.
 * - Direct integration with CartContext for modifying line items.
 * 
 * @param {Object} props
 * @param {Object} props.route - Route parameters containing product context.
 * @param {Object} props.navigation - Navigation controller.
 */
const AddonsScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { fetchCart } = useCart();

  // Params from navigation
  const {
    product,           // The product that was added to cart
    productId,         // Product ID used in cart
    variantName,       // Selected variant name
    addonGroupIds,     // Array of addon group IDs to fetch
    currency = 'EUR'
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addonGroups, setAddonGroups] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState({}); // { groupId: { optionId: { ...opt, quantity } } }

  // Fetch addon groups on mount
  useEffect(() => {
    const loadAddons = async () => {
      if (!addonGroupIds || addonGroupIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const groups = await fetchAddonGroups(addonGroupIds);
        const processedGroups = groups.map(g => g.data || g).filter(g => g && !g.isDeleted);
        setAddonGroups(processedGroups);
      } catch (error) {
        console.error('[AddonsScreen] Failed to load addons:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAddons();
  }, [addonGroupIds]);

  // Calculate total addon price
  const calculateAddonTotal = () => {
    let total = 0;
    Object.values(selectedAddons).forEach(groupSelections => {
      Object.values(groupSelections).forEach(opt => {
        if (opt.price) {
          total += Number(opt.price) * (opt.quantity || 1);
        }
      });
    });
    return total;
  };

  // Handle addon selection toggle
  const toggleAddon = (group, opt) => {
    setSelectedAddons(prev => {
      const groupSelections = prev[group._id] || {};
      const newGroupSelections = { ...groupSelections };
      const isSelected = !!newGroupSelections[opt._id];

      if (group.maxSelectable === 1) {
        // Radio behavior - select this, deselect others
        if (isSelected) {
          delete newGroupSelections[opt._id];
        } else {
          return { ...prev, [group._id]: { [opt._id]: { ...opt, quantity: 1 } } };
        }
      } else {
        // Multi behavior
        if (isSelected) {
          delete newGroupSelections[opt._id];
        } else {
          const currentTotalCount = Object.values(groupSelections).reduce((s, o) => s + (o.quantity || 0), 0);
          if (group.maxSelectable > 1 && currentTotalCount >= group.maxSelectable) return prev;
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
          if (totalCount >= group.maxSelectable) return prev;
        }
        newGroupSelections[opt._id] = { ...existing, quantity: newQty };
      }

      return { ...prev, [group._id]: newGroupSelections };
    });
  };

  // Save addons to cart via API
  const handleSaveAddons = async () => {
    // Build list of addon updates
    const addonUpdates = [];
    Object.values(selectedAddons).forEach(groupSelections => {
      Object.values(groupSelections).forEach(opt => {
        if (opt._id && opt.quantity > 0) {
          addonUpdates.push({
            optionId: opt._id,
            quantity: opt.quantity,
            name: opt.name,
            price: opt.price
          });
        }
      });
    });

    if (addonUpdates.length === 0) {
      // No addons selected, just go back
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      // Call update-addon-quantity API for each addon
      for (const addon of addonUpdates) {
        for (let i = 0; i < addon.quantity; i++) {
          await CartAPI.updateAddonQuantity(
            productId,
            variantName || 'Standard',
            addon.optionId,
            'increment'
          );
        }
      }

      console.log('[AddonsScreen] Successfully added addons');

      // Refresh cart from backend to get updated subtotal with addons
      await fetchCart({ force: true });

      navigation.goBack();
    } catch (error) {
      console.error('[AddonsScreen] Failed to save addons:', error);
      // Still refresh cart and go back, addons are optional
      await fetchCart({ force: true }).catch(() => { });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  // Skip addons
  const handleSkip = () => {
    navigation.goBack();
  };

  const addonTotal = calculateAddonTotal();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {t('loadingAddons') || 'Loading extras...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {t('addExtras') || 'Add Extras'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
            {product?.name || 'Your item'}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.primary }]}>
            {t('skip') || 'Skip'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {addonGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={64} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {t('noAddonsAvailable') || 'No extras available for this item'}
            </Text>
          </View>
        ) : (
          addonGroups.map((group) => {
            const isMultiSelect = group.maxSelectable !== 1;
            return (
              <View key={group._id} style={[styles.addonGroup, { backgroundColor: colors.surface }]}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View>
                    <Text style={[styles.groupTitle, { color: colors.text.primary }]}>
                      {group.title || group.name}
                      {group.minSelectable > 0 && <Text style={{ color: colors.error || 'red' }}> *</Text>}
                    </Text>
                    {group.description && (
                      <Text style={[styles.groupDescription, { color: colors.text.secondary }]}>
                        {group.description}
                      </Text>
                    )}
                  </View>
                  {group.maxSelectable > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {group.maxSelectable === 1
                          ? (t('pick1') || 'Pick 1')
                          : `${t('upto') || 'Up to'} ${group.maxSelectable}`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Options */}
                {(group.options || []).map((opt) => {
                  const existing = selectedAddons[group._id]?.[opt._id];
                  const isSelected = !!existing;
                  const currentQty = existing?.quantity || 0;

                  return (
                    <View
                      key={opt._id}
                      style={[styles.optionRow, { borderBottomColor: colors.border + '30' }]}
                    >
                      {/* Selection Toggle */}
                      <TouchableOpacity
                        style={styles.optionLeft}
                        onPress={() => toggleAddon(group, opt)}
                        activeOpacity={0.7}
                      >
                        {isMultiSelect ? (
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? colors.primary : colors.text.light}
                          />
                        ) : (
                          <Ionicons
                            name={isSelected ? "radio-button-on" : "radio-button-off"}
                            size={24}
                            color={isSelected ? colors.primary : colors.text.light}
                          />
                        )}
                        <Text style={[
                          styles.optionName,
                          { color: isSelected ? colors.text.primary : colors.text.secondary },
                          isSelected && styles.optionNameSelected
                        ]}>
                          {opt.name}
                        </Text>
                      </TouchableOpacity>

                      {/* Right side: Price & Quantity */}
                      <View style={styles.optionRight}>
                        {opt.price > 0 && (
                          <Text style={[styles.optionPrice, { color: isSelected ? colors.primary : colors.text.primary }]}>
                            +{formatCurrency(currency, opt.price)}
                          </Text>
                        )}

                        {/* Quantity Controls - Show when selected */}
                        {isSelected && (
                          <View style={[styles.quantityControl, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                            <TouchableOpacity
                              style={[styles.qtyBtn, { backgroundColor: colors.background }]}
                              onPress={() => updateAddonQuantity(group, opt, -1)}
                            >
                              <Ionicons name="remove" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={[styles.qtyText, { color: colors.text.primary }]}>{currentQty}</Text>
                            <TouchableOpacity
                              style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                              onPress={() => updateAddonQuantity(group, opt, 1)}
                            >
                              <Ionicons name="add" size={18} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveAddons}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {addonTotal > 0
                  ? `${t('addExtras') || 'Add Extras'} (+${formatCurrency(currency, addonTotal)})`
                  : (t('continue') || 'Continue')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
    minWidth: 50,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  addonGroup: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
  },
  groupDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
    flex: 1,
  },
  optionNameSelected: {
    fontFamily: 'Poppins-Medium',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginRight: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default AddonsScreen;
