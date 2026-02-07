import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const { fetchCart } = useCart();
  const insets = useSafeAreaInsets();

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
            optionId: opt._id,
            quantity: opt.quantity, // We'll loop this many times for the API call 
            name: opt.name,
            price: opt.price
          });
        }
      });
    });

    if (addonUpdates.length === 0) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      // Call update-addon-quantity API for each addon unit
      // Optimization: Could we batch this? The API seems to be one-by-one or via looping.
      // Existing logic used loops. preserving that safetly.
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

  const handleSkip = () => {
    navigation.goBack();
  };

  const addonTotal = calculateAddonTotal();
  const taxTotal = calculateTaxTotal();

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('customize') || 'Customize'}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
            {product?.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipButtonText, { color: colors.text.secondary }]}>{t('skip') || 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
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
                <View style={[styles.optionsList, { borderTopColor: colors.border }]}>
                  {(group.options || []).map((opt) => {
                    const isSelected = !!groupSelections[opt._id];

                    return (
                      <TouchableOpacity
                        key={opt._id}
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
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
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + 16
      }]}>
        {addonTotal > 0 && (
          <Text style={[styles.taxText, { color: colors.text.secondary }]}>
            {/* Tax display removed from here as per request */}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isValid ? colors.primary : colors.disabled || '#E0E0E0' }
          ]}
          onPress={handleSaveAddons}
          disabled={saving || !isValid}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Text style={styles.actionButtonText}>
                {addonTotal > 0
                  ? `${t('addToOrder') || 'Add to Order'} • ${formatCurrency(currency, addonTotal)}`
                  : (t('saveContinu') || 'Save & Continue')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    padding: 8,
    marginLeft: -8,
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
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
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
  actionButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', // Shadow for the button itself
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  taxText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
});

export default AddonsScreen;
