import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useCart } from '../contexts/CartContext';
import CartList from '../components/CartList';

const CartScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Use Cart context for real data (cartsArray provides multiple vendor carts)
  const { cartsArray, itemCount, syncing, fetchCart } = useCart();

  // Keep latest fetchCart in a ref to avoid useFocusEffect dependency churn
  const fetchCartRef = useRef(fetchCart);
  useEffect(() => { fetchCartRef.current = fetchCart; }, [fetchCart]);

  // Fetch cart data when screen comes into focus (call the ref, no dependency on function identity)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadCart = async () => {
        const fn = fetchCartRef.current;
        if (fn && active) {
          const result = await fn({ silent: true });
          if (result?.skipped) {
            console.debug('[CartScreen] fetch skipped:', result.reason);
          } else if (!result?.success) {
            console.warn('[CartScreen] Failed to fetch cart:', result?.error);
          } else {
            console.debug('[CartScreen] cart fetched');
          }
        }
      };
      loadCart();
      return () => { active = false; };
    }, [])
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchCart({ force: true });
    if (!result.success) {
      console.warn('[CartScreen] Failed to refresh cart:', result.error);
    }
    setRefreshing(false);
  }, [fetchCart]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {/* Modern Header (Clean & Minimal) */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart')}</Text>
          {itemCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{itemCount}</Text>
            </View>
          )}
        </View>
        {/* Optional: Add an action here if needed, like 'Edit' */}
      </View>

      {/* Syncing Indicator */}
      {syncing && (
        <View style={[styles.syncingBanner, { backgroundColor: colors.primary + '10' }]}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.syncingText, { color: colors.primary }]}>Updating your cart...</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {cartsArray.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
              <Ionicons name="basket-outline" size={60} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Your basket is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              Go ahead and order some yummy food!
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Categories')}
            >
              <Text style={[styles.browseButtonText, { color: colors.text.white || '#fff' }]}>Browse Food</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingTop: 10 }}>
            <CartList navigation={navigation} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9F9F9',
    // Removed border/shadow for glovo-like cleanliness
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
  },
  badge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  syncingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  syncingText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  browseButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});

export default CartScreen;
