import React, { useCallback, useState } from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, RefreshControl } from 'react-native';
import CartDetail from '../components/CartDetail';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../contexts/CartContext';
import { useFocusEffect } from '@react-navigation/native';

/**
 * CartDetailScreen — Clean Frutti Pizza inspired
 */
export default function CartDetailScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { vendorId } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { getVendorCart, fetchCart, itemCount } = useCart();
  const vendor = getVendorCart(vendorId) || {};
  const cart = getVendorCart(vendorId);
  const cartItemCount = cart ? Object.keys(cart.items || {}).reduce((s, id) => s + (cart.items[id]?.quantity || 0), 0) : 0;

  useFocusEffect(
    useCallback(() => {
      fetchCart({ force: true, silent: true });
    }, [fetchCart])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Clean Premium Header */}
      <View style={[styles.headerContainer]}>
        <LinearGradient
          colors={isDarkMode ? ['#1A0A15', '#1A0A15'] : ['#FFF5F8', '#FFE8F0']}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {cart?.vendorName || t('cart') || 'Cart'}
            </Text>
            {cartItemCount > 0 && (
              <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
                {cartItemCount} {cartItemCount === 1 ? (t('item') || 'item') : (t('items') || 'items')}
              </Text>
            )}
          </View>

          <View style={{ width: 40 }} />
        </LinearGradient>
      </View>

      <CartDetail vendorId={vendorId} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: -2,
  },
});
