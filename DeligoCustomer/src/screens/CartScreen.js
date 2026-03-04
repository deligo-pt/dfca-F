import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar, Animated, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useCart } from '../contexts/CartContext';
import CartList from '../components/CartList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CartScreen — Premium 3-Inspiration Blend
 * Gradient hero header, premium empty state, syncing banner
 */
const CartScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { cartsArray, itemCount, syncing, fetchCart } = useCart();
  const insets = useSafeAreaInsets();

  const fetchCartRef = useRef(fetchCart);
  useEffect(() => { fetchCartRef.current = fetchCart; }, [fetchCart]);

  // Empty state animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (cartsArray.length === 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [cartsArray.length]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadCart = async () => {
        const fn = fetchCartRef.current;
        if (fn && active) {
          const result = await fn({ silent: true, force: true });
          if (result?.skipped) console.debug('[CartScreen] fetch skipped:', result.reason);
          else if (!result?.success) console.warn('[CartScreen] Failed to fetch cart:', result?.error);
        }
      };
      loadCart();
      return () => { active = false; };
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchCart({ force: true });
    if (!result.success) console.warn('[CartScreen] Failed to refresh cart:', result.error);
    setRefreshing(false);
  }, [fetchCart]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* ═══════ PREMIUM HEADER — Gradient accent ═══════ */}
      <View style={[styles.header]}>
        <LinearGradient
          colors={isDarkMode ? ['#1A0A15', '#1A0A15'] : ['#FFF5F8', '#FFE8F0']}
          style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.headerIconBg, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name="bag-handle" size={22} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('cart') || 'Cart'}</Text>
                {itemCount > 0 && (
                  <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
                    {itemCount} {itemCount === 1 ? (t('item') || 'item') : (t('items') || 'items')}
                  </Text>
                )}
              </View>
            </View>
            {itemCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Syncing Banner */}
      {syncing && (
        <View style={[styles.syncingBanner, { backgroundColor: colors.primary + '0A', borderBottomColor: colors.primary + '15' }]}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.syncingText, { color: colors.primary }]}>{t('updatingCart') || 'Updating cart...'}</Text>
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
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      >
        {cartsArray.length === 0 ? (
          /* ═══════ PREMIUM EMPTY STATE ═══════ */
          <View style={styles.emptyContainer}>
            <Animated.View style={[styles.emptyIconOuter, {
              backgroundColor: colors.primary + '08',
              transform: [{ scale: pulseAnim }],
            }]}>
              <View style={[styles.emptyIconInner, { backgroundColor: colors.primary + '12' }]}>
                <View style={[styles.emptyIconCore, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="bag-outline" size={48} color={colors.primary} />
                </View>
              </View>
            </Animated.View>

            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {t('cartEmpty') || 'Your cart is empty'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {t('goAheadOrder') || "Discover amazing food and add them to your cart!"}
            </Text>

            <TouchableOpacity
              style={[styles.browseButton, { overflow: 'hidden' }]}
              onPress={() => navigation.navigate('Categories')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#DC3173', '#A8154E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.browseButtonGradient}
              >
                <Ionicons name="restaurant-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.browseButtonText}>{t('browseFood') || 'Browse Food'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingTop: 6 }}>
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
  // Header
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: -3,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#DC3173',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  // Syncing
  syncingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  syncingText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emptyIconInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 36,
    lineHeight: 22,
  },
  browseButton: {
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#DC3173',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  browseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});

export default CartScreen;
