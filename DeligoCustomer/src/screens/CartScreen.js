import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
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
  const { colors } = useTheme();
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
          const result = await fn();
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
      {/* Modern Header with Badge */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="cart" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart')}</Text>
          {itemCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Syncing Indicator */}
      {syncing && (
        <View style={[styles.syncingBanner, { backgroundColor: colors.primary + '15' }]}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.syncingText, { color: colors.primary }]}>Syncing cart...</Text>
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
      >
        {cartsArray.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="cart-outline" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Your cart is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              Add delicious items from restaurants to get started
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Home')}
            >
              <Ionicons name="restaurant" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CartList navigation={navigation} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontFamily: 'Poppins-Bold',
    marginLeft: spacing.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  syncingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  syncingText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Bold',
  },
});

export default CartScreen;
