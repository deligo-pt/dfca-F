/**
 * OrdersScreen — Premium Design (Cart Inspiration Blend)
 *
 * Displays user order history and active statuses with elevated cards,
 * circular vendor images, gradient accents, and pulsing active states.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  BackHandler,
  Animated
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from '../utils/storage';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useOrders } from '../contexts/OrdersContext';

const OrdersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { ongoingOrders, pastOrders, loading: ordersLoading, fetchOrders } = useOrders();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [refreshing, setRefreshing] = useState(false);
  const { products } = useProducts();
  const [displayOrders, setDisplayOrders] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  // Animation for empty state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if ((activeTab === 'ongoing' && ongoingOrders.length === 0) || (activeTab === 'history' && pastOrders.length === 0)) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeTab, ongoingOrders.length, pastOrders.length]);

  const getVendorDetails = (vendorIds) => {
    const vendorMap = {};
    vendorIds.forEach(vendorId => {
      const productFromVendor = products.find(product => {
        const prodVendorId = product.vendor?.id || product._raw?.vendorId?._id || product._raw?.vendorId;
        return prodVendorId === vendorId;
      });
      if (productFromVendor) {
        const v = productFromVendor.vendor;
        if (v) {
          vendorMap[vendorId] = { name: v.vendorName !== 'Unknown' ? v.vendorName : null, image: v.storePhoto };
        }
      }
    });
    return vendorMap;
  };

  const updateOrdersWithVendorDetails = (ordersToUpdate) => {
    const uniqueVendorIds = [...new Set(ordersToUpdate.map(o => o.vendorId).filter(Boolean))];
    if (uniqueVendorIds.length === 0) return;
    const vendorMap = getVendorDetails(uniqueVendorIds);
    if (Object.keys(vendorMap).length > 0) {
      setDisplayOrders(prevOrders => prevOrders.map(order => {
        const details = vendorMap[order.vendorId];
        return { ...order, vendorName: details?.name || order.vendorName, vendorImage: details?.image || order.vendorImage };
      }));
    }
  };

  useEffect(() => {
    if (activeTab === 'ongoing') {
      setDisplayOrders(ongoingOrders);
      setTimeout(() => updateOrdersWithVendorDetails(ongoingOrders), 0);
    } else {
      setDisplayOrders(pastOrders);
      setTimeout(() => updateOrdersWithVendorDetails(pastOrders), 0);
    }
  }, [activeTab, ongoingOrders, pastOrders, products]);

  useEffect(() => {
    const backAction = () => { navigation.navigate('Main'); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(true);
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PENDING': return { name: 'clock-outline', color: '#FFA000', label: t('pending') || 'Pending' };
      case 'ACCEPTED': return { name: 'chef-hat', color: '#DC3173', label: t('accepted') || 'Preparing' };
      case 'AWAITING_PARTNER': return { name: 'moped-outline', color: '#FFA000', label: t('awaitingPartner') || 'Finding Driver' };
      case 'DISPATCHING': return { name: 'bike', color: '#2196F3', label: t('dispatching') || 'Dispatching' };
      case 'ASSIGNED': return { name: 'account-check-outline', color: '#2196F3', label: t('assigned') || 'Driver Assigned' };
      case 'REASSIGNMENT_NEEDED': return { name: 'alert-circle-outline', color: '#D32F2F', label: t('reassignmentNeeded') || 'Reassigning' };
      case 'PICKED_UP': return { name: 'bike-fast', color: '#2196F3', label: t('pickedUp') || 'Picked Up' };
      case 'ON_THE_WAY': return { name: 'map-marker-path', color: '#2196F3', label: t('onTheWay') || 'On the way' };
      case 'DELIVERED': return { name: 'check-decagram', color: '#4CAF50', label: t('delivered') || 'Delivered' };
      case 'CANCELED':
      case 'REJECTED': return { name: 'close-circle-outline', color: '#D32F2F', label: t('canceled') || 'Canceled' };
      default: return { name: 'clock-outline', color: colors.text?.secondary || '#999', label: t('processing') || 'Processing' };
    }
  };

  const { addItem } = useCart();
  const handleReorder = async (order) => {
    if (!order || !order.items || order.items.length === 0) return;
    try {
      setLoadingAction(true);
      const vendorId = order.vendorId;
      let vendorDetails = { vendorName: order.vendorName, vendorImage: order.vendorImage };
      try {
        const token = await StorageService.getAccessToken();
        const rawToken = (token && typeof token === 'object') ? (token.accessToken || token.token) : token;
        const authHeader = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.substring(7) : rawToken) : null;
        if (authHeader && vendorId) {
          const vRes = await fetch(`${BASE_API_URL}${API_ENDPOINTS.RESTAURANTS.GET_DETAILS.replace(':id', vendorId)}`, { headers: { 'Content-Type': 'application/json', 'Authorization': authHeader } });
          if (vRes.ok) {
            const vData = await vRes.json();
            const v = vData.data || vData;
            if (v) {
              vendorDetails.vendorName = v.businessDetails?.businessName || v.businessName || v.vendorName || v.name || v.restaurantName;
              vendorDetails.vendorImage = v.storePhoto || v.logo || v.image;
            }
          }
        }
      } catch (err) { }

      let successCount = 0;
      for (const item of order.items) {
        const product = { _id: item.productId || item._id, name: item.name, price: item.price, pricing: { price: item.price }, image: item.image, vendor: { vendorId: vendorId, vendorName: vendorDetails.vendorName || 'Vendor', storePhoto: vendorDetails.vendorImage } };
        const result = await addItem(product, item.quantity || 1);
        if (result.success) successCount++;
      }
      setLoadingAction(false);
      if (successCount > 0) navigation.navigate('CartDetail', { vendorId: vendorId });
    } catch (e) { setLoadingAction(false); }
  };

  const renderOrderCard = (order, isOngoing = false) => {
    const statusData = getStatusIcon(order.orderStatus);
    const formatDate = (ds) => { try { return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return 'N/A'; } };
    const formatTime = (ds) => { try { return new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return 'N/A'; } };
    const itemsList = order.items?.map(it => `${it.itemSummary?.quantity ?? it.quantity ?? 1}x ${it.name}`).join(', ') || t('items') || 'items';
    const totalItems = order.items?.reduce((s, it) => s + (it.itemSummary?.quantity ?? it.quantity ?? 1), 0) || 0;
    const finalPrice = Number(order.payoutSummary?.grandTotal ?? order.totalAmount ?? order.total ?? order.grandTotal ?? 0).toFixed(2);
    const vendorImgSrc = order.vendorImage ? { uri: order.vendorImage } : null;

    return (
      <TouchableOpacity
        key={order._id || order.orderId}
        style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#2A2A2A' : 'rgba(0,0,0,0.04)' }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TrackOrder', { order })}
      >
        {/* Top: Vendor Info & Subheader */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Premium circular image */}
            <View style={styles.vendorImgWrapper}>
              {vendorImgSrc ? (
                <Image source={vendorImgSrc} style={styles.vendorImage} />
              ) : (
                <View style={[styles.vendorImage, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="receipt-outline" size={24} color={colors.text.light} />
                </View>
              )}
            </View>

            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.vendorName, { color: colors.text.primary }]} numberOfLines={1}>
                {order.vendorName || t('groceriesAndFood') || 'Deligo Order'}
              </Text>

              <View style={styles.infoPillsRow}>
                <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5' }]}>
                  <Ionicons name="calendar-outline" size={11} color={colors.text.secondary} />
                  <Text style={[styles.infoPillText, { color: colors.text.secondary }]}>{formatDate(order.createdAt)} • {formatTime(order.createdAt)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.orderPrice, { color: colors.primary }]}>€{finalPrice}</Text>
          </View>
        </View>

        {/* Status Tracker Bar for Ongoing */}
        {isOngoing && (
          <View style={[styles.statusBarWrapper, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5' }]}>
            <View style={[styles.statusBarFill, {
              backgroundColor: statusData.color,
              width: order.orderStatus === 'DELIVERED' ? '100%' : order.orderStatus === 'ON_THE_WAY' ? '75%' : order.orderStatus === 'COOKING' || order.orderStatus === 'ACCEPTED' ? '50%' : '25%'
            }]} />
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }]} />

        {/* Middle: Items List */}
        <View style={styles.itemsContainer}>
          <View style={[styles.itemCountBadge, { backgroundColor: isDarkMode ? 'rgba(220,49,115,0.15)' : 'rgba(220,49,115,0.08)' }]}>
            <Text style={[styles.itemCountText, { color: colors.primary }]}>{totalItems}</Text>
          </View>
          <Text style={[styles.itemsText, { color: colors.text.secondary }]} numberOfLines={2}>
            {itemsList}
          </Text>
        </View>

        {/* Bottom: Actions & Status Badge */}
        <View style={styles.actionsContainer}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusData.color + '15' }]}>
            <MaterialCommunityIcons name={statusData.name} size={14} color={statusData.color} style={{ marginRight: 6 }} />
            <Text style={[styles.statusText, { color: statusData.color }]}>{statusData.label}</Text>
          </View>

          {/* Action Button */}
          {isOngoing ? (
            <TouchableOpacity style={styles.actionBtnContainer} onPress={() => navigation.navigate('TrackOrder', { order })}>
              <LinearGradient colors={['#DC3173', '#A8154E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradientBtn}>
                <Text style={styles.primaryBtnText}>{t('trackOrder') || 'Track'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5' }]} onPress={() => handleReorder(order)} disabled={loadingAction}>
              {loadingAction ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <>
                  <Ionicons name="reload" size={14} color={colors.text.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.reorderBtnText, { color: colors.text.primary }]}>{t('reorder') || 'Reorder'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Animated.View style={[styles.emptyIconOuter, { backgroundColor: colors.primary + '08', transform: [{ scale: pulseAnim }] }]}>
        <View style={[styles.emptyIconInner, { backgroundColor: colors.primary + '12' }]}>
          <View style={[styles.emptyIconCore, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name={type === 'ongoing' ? "bicycle-outline" : "receipt-outline"} size={48} color={colors.primary} />
          </View>
        </View>
      </Animated.View>
      <Text style={[styles.emptyStateTitle, { color: colors.text.primary }]}>
        {type === 'ongoing' ? (t('noActiveOrders') || 'No active orders') : (t('noPastOrders') || 'No past orders')}
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
        {type === 'ongoing' ? (t('noOrdersInProgress') || "You don't have any orders in progress.") : (t('noOrdersYet') || "Looks like you haven't ordered anything yet.")}
      </Text>
      <TouchableOpacity style={styles.browseButtonContainer} onPress={() => navigation.navigate('Categories')} activeOpacity={0.88}>
        <LinearGradient colors={['#DC3173', '#A8154E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.browseButtonGradient}>
          <Text style={styles.browseButtonText}>{t('browseAndOrder') || 'Start Shopping'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} animated={true} />

      {/* Header with Title and Tabs */}
      <View style={styles.headerArea}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconBg, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="receipt" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('orders') || 'Orders'}</Text>
        </View>

        {/* Premium Pill Tabs */}
        <View style={[styles.tabWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F0F0F0' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ongoing' && [styles.activeTab, { backgroundColor: colors.surface, shadowColor: colors.shadow }]]}
            onPress={() => setActiveTab('ongoing')} activeOpacity={0.9}
          >
            <Text style={[styles.tabText, { color: activeTab === 'ongoing' ? colors.primary : colors.text.secondary }]}>{t('ongoing') || 'Ongoing'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && [styles.activeTab, { backgroundColor: colors.surface, shadowColor: colors.shadow }]]}
            onPress={() => setActiveTab('history')} activeOpacity={0.9}
          >
            <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.text.secondary }]}>{t('history') || 'History'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {ordersLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {displayOrders.length > 0 ? (
            displayOrders.map(order => renderOrderCard(order, activeTab === 'ongoing'))
          ) : (
            renderEmptyState(activeTab)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Header & Tabs
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  tabWrapper: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 5,
    height: 54,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeTab: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Order Card
  orderCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorImgWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(220,49,115,0.15)',
    overflow: 'hidden',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vendorName: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  infoPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  infoPillText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginLeft: 4,
  },
  orderPrice: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  // Progress Bar
  statusBarWrapper: {
    height: 6,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  // Items
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingRight: 10,
  },
  itemCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  itemCountText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  itemsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
  },
  actionBtnContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
  },
  primaryGradientBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  reorderBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
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
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  browseButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
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

export default OrdersScreen;
