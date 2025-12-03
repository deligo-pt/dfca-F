import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from '../utils/storage';

const OrdersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseData = await response.json();
      console.debug('[OrdersScreen] Orders response:', responseData);

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to fetch orders');
      }

      // Extract orders from response
      const ordersData = responseData?.data || [];
      setOrders(ordersData);

    } catch (err) {
      console.error('[OrdersScreen] Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  // Separate orders into ongoing and history based on the provided status list
  const getOngoingOrders = () => {
    return orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(order.orderStatus?.toUpperCase())
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
      case 'ASSIGNED':
        return { name: 'person-outline', library: 'Ionicons', color: colors.info || '#2196F3' };
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
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'ASSIGNED':
        return 'Assigned';
      case 'PICKED_UP':
        return 'Picked Up';
      case 'ON_THE_WAY':
        return t('onTheWay');
      case 'DELIVERED':
        return t('delivered');
      case 'CANCELED':
        return 'Canceled';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Processing';
    }
  };

  const renderOrderCard = (order, isOngoing = false) => {
    const statusIcon = getStatusIcon(order.orderStatus);

    // Format date and time
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    const itemsList = order.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'No items';

    // Placeholder image (you can update with vendor logo later)
    const restaurantImage = require('../assets/images/logo.png');

    return (
      <TouchableOpacity
        key={order._id || order.orderId}
        style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
        activeOpacity={0.7}
        onPress={() => isOngoing ? navigation.navigate('TrackOrder', { order }) : null}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <Image
            source={restaurantImage}
            style={[styles.restaurantImage, { backgroundColor: colors.background }]}
            resizeMode="cover"
          />
          <View style={styles.orderHeaderInfo}>
            <Text style={[styles.restaurantName, { color: colors.text.primary }]}>
              {order.vendorId || 'Restaurant'}
            </Text>
            <Text style={[styles.orderNumber, { color: colors.text.secondary }]}>
              {order.orderId}
            </Text>
            <Text style={[styles.orderDateTime, { color: colors.text.light }]}>
              {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.orderItems, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.itemsText, { color: colors.text.secondary }]} numberOfLines={2}>
            {itemsList}
          </Text>
          <Text style={[styles.itemsCount, { color: colors.text.light }]}>
            {order.totalItems} item{order.totalItems > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Order Footer */}
        <View style={styles.orderFooter}>
          <View style={styles.statusContainer}>
            {statusIcon.library === 'Ionicons' ? (
              <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
            ) : (
              <MaterialIcons name={statusIcon.name} size={20} color={statusIcon.color} />
            )}
            <Text style={[styles.statusText, { color: statusIcon.color }]}>
              {getStatusText(order.orderStatus)}
            </Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.text.primary }]}>
            €{order.finalAmount?.toFixed(2) || order.totalPrice?.toFixed(2) || '0.00'}
          </Text>
        </View>

        {/* Estimated Time for Ongoing Orders */}
        {isOngoing && order.estimatedDeliveryTime && order.estimatedDeliveryTime !== 'N/A' && (
          <View style={[styles.estimatedTimeContainer, { borderTopColor: colors.border }]}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.estimatedTimeText, { color: colors.primary }]}>
              {t('estimated')} {t('deliveryTime')}: {order.estimatedDeliveryTime}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOngoing ? (
            <>
              <TouchableOpacity
                style={[styles.trackButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('TrackOrder', { order })}
              >
                <Ionicons name="location" size={18} color={colors.text.white} />
                <Text style={[styles.trackButtonText, { color: colors.text.white }]}>{t('trackOrder')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helpButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.helpButtonText, { color: colors.primary }]}>{t('helpCenter')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.reorderButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <MaterialIcons name="replay" size={18} color={colors.primary} />
                <Text style={[styles.reorderButtonText, { color: colors.primary }]}>{t('orderAgain')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reviewButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Ionicons name="star-outline" size={18} color={colors.primary} />
                <Text style={[styles.reviewButtonText, { color: colors.primary }]}>{t('rating')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'ongoing' ? 'receipt-outline' : 'time-outline'}
        size={80}
        color={colors.text.light}
      />
      <Text style={[styles.emptyStateTitle, { color: colors.text.primary }]}>
        {type === 'ongoing' ? t('noOrders') : t('noOrders')}
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
        {type === 'ongoing'
          ? 'Your active orders will appear here'
          : 'Your past orders will appear here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerText, { color: colors.text.primary }]}>{t('orders')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.surface },
              activeTab === 'ongoing' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveTab('ongoing')}
          >
            <Text style={[
              styles.tabText,
              { color: colors.text.secondary },
              activeTab === 'ongoing' && { color: colors.text.white }
            ]}>
              {t('ongoingOrders')}
            </Text>
            {ongoingOrders.length > 0 && (
              <View style={[styles.badge, { backgroundColor: activeTab === 'ongoing' ? colors.text.white : colors.primary }]}>
                <Text style={[styles.badgeText, { color: activeTab === 'ongoing' ? colors.primary : colors.text.white }]}>{ongoingOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.surface },
              activeTab === 'history' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[
              styles.tabText,
              { color: colors.text.secondary },
              activeTab === 'history' && { color: colors.text.white }
            ]}>
              {t('pastOrders')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.text.primary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => fetchOrders()}
            >
              <Text style={[styles.retryButtonText, { color: colors.text.white }]}>Retry</Text>
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  orderHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  orderDateTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  orderItems: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  itemsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  estimatedTimeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 6,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 6,
  },
  reorderButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  reorderButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 6,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  reviewButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

export default OrdersScreen;
