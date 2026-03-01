import React, { useCallback, useState } from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, RefreshControl } from 'react-native';
import CartDetail from '../components/CartDetail';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';
import { useFocusEffect } from '@react-navigation/native';

/**
 * CartDetailScreen
 * 
 * Displays the full details of a specific vendor cart.
 * Acts as a wrapper around the `CartDetail` component, handling route parameters
 * and providing a dedicated navigation context for the shopping cart view.
 * 
 * @param {Object} props
 * @param {Object} props.route - Route parameters containing `vendorId`.
 * @param {Object} props.navigation - Navigation prop.
 */
export default function CartDetailScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { vendorId } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const { getVendorCart, fetchCart, itemCount } = useCart();
  const vendor = getVendorCart(vendorId) || {};
  const cart = getVendorCart(vendorId);
  const cartItemCount = cart ? Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id]?.quantity || 0), 0) : 0;

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchCart({ force: true, silent: true });
    }, [fetchCart])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {vendor.vendorName || t('yourCart')}
          </Text>
          {cartItemCount > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
              {cartItemCount} {cartItemCount === 1 ? (t('item') || 'item') : (t('items') || 'items')}
            </Text>
          )}
        </View>

        {/* Spacer to balance the back button */}
        <View style={{ width: 40 }} />
      </View>

      <CartDetail vendorId={vendorId} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: -2,
  },
});
