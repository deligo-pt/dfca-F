/**
 * OrdersScreen
 * 
 * Displays user order history and active statuses.
 * Tabs:
 * - Ongoing: Real-time tracking for active orders.
 * - History: Past delivered or cancelled orders.
 * 
 * Features:
 * - Pull-to-refresh for latest status.
 * - One-tap reordering from history.
 * - Detailed status indicators (Pending, Cooking, Delivered).
 */
import React, { useState, useEffect } from 'react';
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
  BackHandler
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from '../utils/storage';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useOrders } from '../contexts/OrdersContext'; // Import useOrders hook

const OrdersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  // Get orders and actions from OrdersContext
  const { ongoingOrders, pastOrders, loading: ordersLoading, fetchOrders } = useOrders();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [refreshing, setRefreshing] = useState(false);

  // Get products from ProductsContext to lookup vendor businessName
  const { products } = useProducts();

  // Computed state for display
  const [displayOrders, setDisplayOrders] = useState([]);

  // Get vendor details (name + image) from ProductsContext products
  const getVendorDetails = (vendorIds) => {
    const vendorMap = {};

    vendorIds.forEach(vendorId => {
      // Find a product from this vendor in the products array
      const productFromVendor = products.find(product => {
        // Check the normalized vendor object (from normalizeProduct)
        const prodVendorId = product.vendor?.id || product._raw?.vendorId?._id || product._raw?.vendorId;
        return prodVendorId === vendorId;
      });

      if (productFromVendor) {
        // The normalized product has vendor object with vendorName and storePhoto
        const v = productFromVendor.vendor;
        if (v) {
          vendorMap[vendorId] = {
            name: v.vendorName !== 'Unknown' ? v.vendorName : null,
            image: v.storePhoto
          };
          console.debug(`[OrdersScreen] Found details for vendor ${vendorId}:`, vendorMap[vendorId]);
        }
      }
    });

    return vendorMap;
  };

  // Update orders with vendor business names and images from ProductsContext
  const updateOrdersWithVendorDetails = (ordersToUpdate) => {
    const uniqueVendorIds = [...new Set(ordersToUpdate.map(o => o.vendorId).filter(Boolean))];
    if (uniqueVendorIds.length === 0) return;

    const vendorMap = getVendorDetails(uniqueVendorIds);

    if (Object.keys(vendorMap).length > 0) {
      setDisplayOrders(prevOrders => prevOrders.map(order => {
        const details = vendorMap[order.vendorId];
        return {
          ...order,
          vendorName: details?.name || order.vendorName,
          vendorImage: details?.image || order.vendorImage
        };
      }));
      console.debug('[OrdersScreen] Updated orders with vendor details from ProductsContext');
    }
  };

  // Sync display orders when tab changes or context data updates
  useEffect(() => {
    if (activeTab === 'ongoing') {
      setDisplayOrders(ongoingOrders);
      // Update vendor details for ongoing orders
      setTimeout(() => updateOrdersWithVendorDetails(ongoingOrders), 0);
    } else {
      setDisplayOrders(pastOrders);
      // Update vendor details for past orders
      setTimeout(() => updateOrdersWithVendorDetails(pastOrders), 0);
    }
  }, [activeTab, ongoingOrders, pastOrders, products]);

  // Initial fetch on mount handled by Context, but we can force refresh if needed
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Optional: force fetch on focus if needed, but context handles auth-based fetching
      // fetchOrders(); 
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      // If we are on Orders tab, pressing back should probably go to Home tab
      navigation.navigate('Main');
      return true; // Prevent default behavior (which causes the crash if no history)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(true); // Force refresh
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return { name: 'clock-outline', library: 'MaterialCommunityIcons', color: colors.warning || '#FFA500' };
      case 'ACCEPTED':
        return { name: 'check-circle-outline', library: 'MaterialCommunityIcons', color: colors.success || '#4CAF50' };
      case 'AWAITING_PARTNER':
        return { name: 'account-clock-outline', library: 'MaterialCommunityIcons', color: colors.warning || '#FFA500' };
      case 'DISPATCHING':
        return { name: 'bike', library: 'MaterialCommunityIcons', color: colors.info || '#2196F3' };
      case 'ASSIGNED':
        return { name: 'account-check-outline', library: 'MaterialCommunityIcons', color: colors.info || '#2196F3' };
      case 'REASSIGNMENT_NEEDED':
        return { name: 'alert-circle-outline', library: 'MaterialCommunityIcons', color: colors.error || '#F44336' };
      case 'PICKED_UP':
        return { name: 'bike-fast', library: 'MaterialCommunityIcons', color: colors.info || '#2196F3' };
      case 'ON_THE_WAY':
        return { name: 'map-marker-path', library: 'MaterialCommunityIcons', color: colors.info || '#2196F3' };
      case 'DELIVERED':
        return { name: 'check-decagram', library: 'MaterialCommunityIcons', color: colors.success || '#4CAF50' };
      case 'CANCELED':
      case 'REJECTED':
        return { name: 'close-circle-outline', library: 'MaterialCommunityIcons', color: colors.error || '#F44336' };
      default:
        return { name: 'clock-outline', library: 'MaterialCommunityIcons', color: colors.text?.secondary || '#999' };
    }
  };

  const getStatusText = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return t('pending') || 'Pending';
      case 'ACCEPTED':
        return t('accepted') || 'Accepted';
      case 'AWAITING_PARTNER':
        return t('awaitingPartner') || 'Looking for Driver';
      case 'DISPATCHING':
        return t('dispatching') || 'Dispatching';
      case 'ASSIGNED':
        return t('assigned') || 'Driver Assigned';
      case 'REASSIGNMENT_NEEDED':
        return t('reassignmentNeeded') || 'Reassigning Driver';
      case 'PICKED_UP':
        return t('pickedUp') || 'Picked Up';
      case 'ON_THE_WAY':
        return t('onTheWay') || 'On the way';
      case 'DELIVERED':
        return t('delivered') || 'Delivered';
      case 'CANCELED':
        return t('canceled') || 'Canceled';
      case 'REJECTED':
        return t('rejected') || 'Rejected';
      default:
        return t('processing') || 'Processing';
    }
  };

  // Reorder functionality
  const { addItem, clearVendorCartAndSync } = useCart();

  const handleReorder = async (order) => {
    if (!order || !order.items || order.items.length === 0) return;

    try {
      setLoading(true);
      const vendorId = order.vendorId;

      // Fetch fresh vendor details to ensure we have name/image for the cart
      // (Order history often lacks full vendor metadata)
      let vendorDetails = { vendorName: order.vendorName, vendorImage: order.vendorImage };
      try {
        const token = await StorageService.getAccessToken();
        const rawToken = (token && typeof token === 'object') ? (token.accessToken || token.token) : token;
        const authHeader = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.substring(7) : rawToken) : null;

        if (authHeader && vendorId) {
          const vendorUrl = `${BASE_API_URL}${API_ENDPOINTS.RESTAURANTS.GET_DETAILS.replace(':id', vendorId)}`;
          const vRes = await fetch(vendorUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            }
          });
          if (vRes.ok) {
            const vData = await vRes.json();
            const v = vData.data || vData;
            if (v) {
              vendorDetails.vendorName = v.businessDetails?.businessName || v.businessName || v.vendorName || v.name || v.restaurantName;
              vendorDetails.vendorImage = v.storePhoto || v.logo || v.image;
              console.log('[OrdersScreen] Fetched vendor details for reorder:', vendorDetails);
            }
          }
        }
      } catch (err) {
        console.warn('[OrdersScreen] Failed to fetch vendor details for reorder', err);
      }

      // Add each item to cart
      let successCount = 0;
      for (const item of order.items) {
        // Construct product object from order item details
        const product = {
          _id: item.productId || item._id, // Ensure ID is passed
          name: item.name,
          price: item.price,
          pricing: { price: item.price }, // normalized structure
          image: item.image,
          vendor: {
            vendorId: vendorId,
            vendorName: vendorDetails.vendorName || 'Vendor',
            storePhoto: vendorDetails.vendorImage
          }
        };

        const result = await addItem(product, item.quantity || 1);
        if (result.success) successCount++;
      }

      setLoading(false);

      if (successCount > 0) {
        // Navigate to Cart Detail for this vendor
        navigation.navigate('CartDetail', { vendorId: vendorId });
      } else {
        // Show error?
        console.warn('Failed to add items for reorder');
      }

    } catch (e) {
      console.error('Reorder failed', e);
      setLoading(false);
    }
  };


  const renderOrderCard = (order, isOngoing = false) => {
    const statusIcon = getStatusIcon(order.orderStatus);

    // Format date and time
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch {
        return 'N/A';
      }
    };

    const formatTime = (dateString) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return 'N/A';
      }
    };

    // Get items list as string
    const itemsList = order.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || t('items') || 'items';

    // Use vendor image if available, else placeholder
    const restaurantImage = order.vendorImage
      ? { uri: order.vendorImage }
      : require('../assets/images/logo.png');

    return (
      <TouchableOpacity
        key={order._id || order.orderId}
        style={[styles.orderCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TrackOrder', { order })}
      >
        {/* Top Section: Vendor Info & Status */}
        <View style={styles.cardHeader}>
          <Image
            source={restaurantImage}
            style={[styles.restaurantImage, { backgroundColor: colors.border }]}
            resizeMode="cover"
          />
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.restaurantName, { color: colors.text.primary }]} numberOfLines={1}>
                {order.vendorName || t('groceriesAndFood') || 'Groceries & Food'}
              </Text>
              <Text style={[styles.orderPrice, { color: colors.text.primary }]}>
                €{Number(order.totalAmount ?? order.total ?? order.grandTotal ?? order.subTotal ?? order.subtotal ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.dateText, { color: colors.text.light }]}>
                {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
              </Text>
              {/* Status Badge with Material Icon */}
              <View style={[styles.statusBadge, { backgroundColor: statusIcon.color + '15', flexDirection: 'row', alignItems: 'center' }]}>
                <MaterialCommunityIcons
                  name={statusIcon.name}
                  size={12}
                  color={statusIcon.color}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.statusText, { color: statusIcon.color }]}>
                  {getStatusText(order.orderStatus)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Middle Section: Items */}
        <View style={styles.itemsContainer}>
          <Text style={[styles.itemsText, { color: colors.text.secondary }]} numberOfLines={2}>
            {itemsList}
          </Text>
        </View>

        {/* Bottom Section: Actions */}
        <View style={styles.actionsContainer}>
          {isOngoing ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('TrackOrder', { order })}
            >
              <Text style={[styles.primaryButtonText, { color: colors.text.white || '#fff' }]}>{t('trackOrder') || 'Track Order'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.reorderButton, { backgroundColor: colors.primary + '15' }]} // Tinted background
              onPress={() => handleReorder(order)}
            >
              <Text style={[styles.reorderButtonText, { color: colors.primary }]}>{t('reorder') || 'Reorder'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Image
        source={require('../assets/images/logo.png')}
        style={[styles.emptyStateImage, { opacity: 0.5 }]}
        resizeMode="contain"
      />
      <Text style={[styles.emptyStateTitle, { color: colors.text.primary }]}>
        {type === 'ongoing' ? (t('noActiveOrders') || 'No active orders') : (t('noPastOrders') || 'No past orders')}
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
        {type === 'ongoing'
          ? (t('noOrdersInProgress') || "You don't have any orders in progress.")
          : (t('noOrdersYet') || "Looks like you haven't ordered anything yet.")}
      </Text>
      <TouchableOpacity
        style={[styles.browseButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Categories')}
      >
        <Text style={[styles.browseButtonText, { color: colors.text.white || '#fff' }]}>{t('browseAndOrder') || 'Start Shopping'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
          animated={true}
        />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('orders') || 'Orders'}</Text>
        </View>

        {/* Tabs - Pill Style */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabWrapper, { backgroundColor: isDarkMode ? colors.surface : '#E0E0E0' }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ongoing' && [styles.activeTab, { backgroundColor: colors.surface, shadowColor: colors.shadow }]
              ]}
              onPress={() => setActiveTab('ongoing')}
              activeOpacity={1}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'ongoing' ? colors.text.primary : colors.text.secondary }
              ]}>
                {t('ongoing') || 'Ongoing'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'history' && [styles.activeTab, { backgroundColor: colors.surface, shadowColor: colors.shadow }]
              ]}
              onPress={() => setActiveTab('history')}
              activeOpacity={1}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'history' ? colors.text.primary : colors.text.secondary }
              ]}>
                {t('history') || 'History'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Orders List */}
        {ordersLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
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
            {displayOrders.length > 0 ? (
              displayOrders.map(order => renderOrderCard(order, activeTab === 'ongoing'))
            ) : (
              renderEmptyState(activeTab)
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
    color: '#1a1a1a',
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tabWrapper: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    height: 50,
    backgroundColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  // Card Styles
  // Card Styles - Premium Industry Grade
  orderCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  orderPrice: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#1a1a1a',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: '#f0f0f0',
  },
  itemsContainer: {
    marginBottom: 18,
  },
  itemsText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  reorderButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(252, 128, 25, 0.08)',
  },
  reorderButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  browseButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  }
});

export default OrdersScreen;
