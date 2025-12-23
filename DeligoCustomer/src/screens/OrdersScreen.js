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
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from '../utils/storage';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';

const OrdersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Get products from ProductsContext to lookup vendor businessName
  const { products } = useProducts();

  // Fetch orders from API
  const fetchOrders = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);

      // Get auth token
      let token = await StorageService.getAccessToken();
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (token) {
        const rawToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        headers.Authorization = rawToken;
      }

      console.debug('[OrdersScreen] Fetching orders from API');
      const url = `${BASE_API_URL}${API_ENDPOINTS.ORDERS.LIST}`;

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const responseData = await response.json();
        console.debug('[OrdersScreen] Orders response:', responseData);

        if (!response.ok) {
          throw new Error(responseData?.message || 'Failed to fetch orders');
        }

        // Extract orders from response
        const ordersData = responseData?.data || [];
        // Normalize vendorId, vendorName, customerId, deliveryAddress, and items
        const normalizedOrders = ordersData.map(order => {
          // Handle vendorId - extract _id and build vendorName from businessName or nested name object
          let normalizedVendorId = order.vendorId;
          let vendorName = order.vendorName;
          if (typeof order.vendorId === 'object' && order.vendorId) {
            normalizedVendorId = order.vendorId._id || order.vendorId;
            // Priority: businessName > businessDetails.businessName > firstName+lastName
            const vendor = order.vendorId;
            const businessDetails = vendor.businessDetails || {};
            if (vendor.businessName) {
              vendorName = vendor.businessName;
            } else if (businessDetails.businessName) {
              vendorName = businessDetails.businessName;
            } else if (typeof vendor.name === 'object' && vendor.name) {
              // Handle nested name object with firstName/lastName
              vendorName = `${vendor.name.firstName || ''} ${vendor.name.lastName || ''}`.trim() || 'Vendor';
            } else {
              vendorName = vendor.name || vendor.vendorName || vendorName || 'Vendor';
            }
          }

          // Handle deliveryAddress - build address string from object
          let deliveryAddressString = order.deliveryAddress;
          if (typeof order.deliveryAddress === 'object' && order.deliveryAddress) {
            const addr = order.deliveryAddress;
            deliveryAddressString = [addr.street, addr.city, addr.state, addr.country]
              .filter(Boolean)
              .join(', ') || 'Address';
          }

          // Handle customerId - extract _id and build customer name from nested name object
          let normalizedCustomerId = order.customerId;
          let customerName = '';
          if (typeof order.customerId === 'object' && order.customerId) {
            normalizedCustomerId = order.customerId._id || order.customerId;
            // Handle nested name object with firstName/lastName
            if (typeof order.customerId.name === 'object' && order.customerId.name) {
              customerName = `${order.customerId.name.firstName || ''} ${order.customerId.name.lastName || ''}`.trim() || 'Customer';
            } else {
              customerName = order.customerId.name || 'Customer';
            }
          }

          // Handle items - extract product name from productId object
          const normalizedItems = (order.items || []).map(item => {
            let productName = item.name;
            if (typeof item.productId === 'object' && item.productId) {
              productName = item.productId.name || item.name || 'Product';
            }
            return {
              ...item,
              name: productName,
              productId: typeof item.productId === 'object' ? item.productId._id : item.productId
            };
          });

          return {
            ...order,
            vendorId: normalizedVendorId,
            vendorName: vendorName,
            deliveryAddress: deliveryAddressString,
            customerId: normalizedCustomerId,
            customerName: customerName,
            items: normalizedItems
          };
        });
        setOrders(normalizedOrders);

        // Update vendor business names from ProductsContext
        // This is called synchronously since we already have the products data
        setTimeout(() => updateOrdersWithBusinessNames(normalizedOrders), 0);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // If aborted due to timeout or network error, still set loading to false
        if (fetchError.name === 'AbortError') {
          console.debug('[OrdersScreen] Request timed out');
          setOrders([]); // Show empty state on timeout
        } else {
          throw fetchError;
        }
      }

    } catch (err) {
      console.error('[OrdersScreen] Error fetching orders:', err);
      // Don't show error for network issues, just show empty state
      setOrders([]);
      // setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Get vendor business names from ProductsContext products
  const getVendorBusinessNames = (vendorIds) => {
    const vendorNameMap = {};

    vendorIds.forEach(vendorId => {
      // Find a product from this vendor in the products array
      const productFromVendor = products.find(product => {
        // Check the normalized vendor object (from normalizeProduct)
        const prodVendorId = product.vendor?.id || product._raw?.vendorId?._id || product._raw?.vendorId;
        return prodVendorId === vendorId;
      });

      if (productFromVendor) {
        // The normalized product has vendor.vendorName which contains businessName
        // from normalizeProduct logic: vendorSource.businessName || businessDetails.businessName
        const businessName = productFromVendor.vendor?.vendorName;
        if (businessName && businessName !== 'Unknown') {
          vendorNameMap[vendorId] = businessName;
          console.debug(`[OrdersScreen] Found businessName for vendor ${vendorId}:`, businessName);
        }
      }
    });

    return vendorNameMap;
  };

  // Update orders with vendor business names from ProductsContext
  const updateOrdersWithBusinessNames = (ordersToUpdate) => {
    const uniqueVendorIds = [...new Set(ordersToUpdate.map(o => o.vendorId).filter(Boolean))];
    if (uniqueVendorIds.length === 0) return;

    const vendorNameMap = getVendorBusinessNames(uniqueVendorIds);

    if (Object.keys(vendorNameMap).length > 0) {
      setOrders(prevOrders => prevOrders.map(order => ({
        ...order,
        vendorName: vendorNameMap[order.vendorId] || order.vendorName
      })));
      console.debug('[OrdersScreen] Updated orders with vendor business names from ProductsContext:', vendorNameMap);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update orders with business names when products change (in case products load after orders)
  useEffect(() => {
    if (orders.length > 0 && products.length > 0) {
      updateOrdersWithBusinessNames(orders);
    }
  }, [products]); // Re-run when products update

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  // Separate orders into ongoing and history based on the provided status list
  const getOngoingOrders = () => {
    return orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'AWAITING_PARTNER', 'DISPATCHING', 'ASSIGNED', 'REASSIGNMENT_NEEDED', 'PICKED_UP', 'ON_THE_WAY'].includes(order.orderStatus?.toUpperCase())
    );
  };

  const getHistoryOrders = () => {
    return orders.filter(order =>
      ['DELIVERED', 'CANCELED', 'REJECTED'].includes(order.orderStatus?.toUpperCase())
    );
  };

  const ongoingOrders = getOngoingOrders();
  const historyOrders = getHistoryOrders();

  const getStatusIcon = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return { name: 'time', library: 'Ionicons', color: colors.warning || '#FFA500' };
      case 'ACCEPTED':
        return { name: 'checkmark-circle', library: 'Ionicons', color: colors.success || '#4CAF50' };
      case 'AWAITING_PARTNER':
        return { name: 'time', library: 'Ionicons', color: colors.warning || '#FFA500' };
      case 'DISPATCHING':
        return { name: 'bicycle', library: 'Ionicons', color: colors.info || '#2196F3' };
      case 'ASSIGNED':
        return { name: 'person-outline', library: 'Ionicons', color: colors.info || '#2196F3' };
      case 'REASSIGNMENT_NEEDED':
        return { name: 'alert-circle', library: 'Ionicons', color: colors.error || '#F44336' };
      case 'PICKED_UP':
        return { name: 'bicycle', library: 'Ionicons', color: colors.info || '#2196F3' };
      case 'ON_THE_WAY':
        return { name: 'bicycle', library: 'Ionicons', color: colors.info || '#2196F3' };
      case 'DELIVERED':
        return { name: 'checkmark-circle', library: 'Ionicons', color: colors.success || '#4CAF50' };
      case 'CANCELED':
      case 'REJECTED':
        return { name: 'close-circle', library: 'Ionicons', color: colors.error || '#F44336' };
      default:
        return { name: 'time', library: 'Ionicons', color: colors.text?.secondary || '#999' };
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

    // Placeholder image
    const restaurantImage = require('../assets/images/logo.png');

    return (
      <TouchableOpacity
        key={order._id || order.orderId}
        style={[styles.orderCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
        activeOpacity={0.9}
        onPress={() => isOngoing ? navigation.navigate('TrackOrder', { order }) : null}
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
                €{order.subTotal?.toFixed(2) || '0.00'}
              </Text>
            </View>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.dateText, { color: colors.text.light }]}>
                {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusIcon.color + '15' }]}>
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
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>{t('somethingWentWrong') || 'Something went wrong'}</Text>
            <TouchableOpacity onPress={() => fetchOrders()} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.primary, fontFamily: 'Poppins-SemiBold' }}>{t('tryAgain') || 'Try Again'}</Text>
            </TouchableOpacity>
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
            {activeTab === 'ongoing' ? (
              ongoingOrders.length > 0 ? (
                ongoingOrders.map(order => renderOrderCard(order, true))
              ) : (
                renderEmptyState('ongoing')
              )
            ) : (
              historyOrders.length > 0 ? (
                historyOrders.map(order => renderOrderCard(order, false))
              ) : (
                renderEmptyState('history')
              )
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabWrapper: {
    flexDirection: 'row',
    borderRadius: 25,
    padding: 4,
    height: 44,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  activeTab: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
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
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    flex: 1,
    marginRight: 8,
  },
  orderPrice: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.5,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  primaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  reorderButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
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
