import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

// Mock data for orders
const mockOrders = {
  // ...existing code...
  ongoing: [
    {
      id: '1',
      restaurantName: 'Burger King',
      restaurantImage: require('../assets/images/logo.png'),
      items: ['Whopper Burger', 'French Fries', 'Coke'],
      totalAmount: 450,
      orderDate: '2024-01-15',
      orderTime: '12:30 PM',
      status: 'preparing',
      estimatedTime: '15-20 min',
      orderNumber: '#ORD-1234',
    },
  ],
  history: [
    {
      id: '2',
      restaurantName: 'Pizza Hut',
      restaurantImage: require('../assets/images/logo.png'),
      items: ['Large Pepperoni Pizza', 'Garlic Bread'],
      totalAmount: 1250,
      orderDate: '2024-01-14',
      orderTime: '7:45 PM',
      status: 'delivered',
      orderNumber: '#ORD-1233',
    },
    {
      id: '3',
      restaurantName: 'KFC',
      restaurantImage: require('../assets/images/logo.png'),
      items: ['Zinger Burger', 'Hot Wings', 'Pepsi'],
      totalAmount: 850,
      orderDate: '2024-01-13',
      orderTime: '2:15 PM',
      status: 'delivered',
      orderNumber: '#ORD-1232',
    },
  ],
};

const OrdersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('ongoing');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'preparing':
        return { name: 'restaurant', library: 'MaterialIcons', color: colors.warning };
      case 'on_the_way':
        return { name: 'bicycle', library: 'Ionicons', color: colors.info };
      case 'delivered':
        return { name: 'checkmark-circle', library: 'Ionicons', color: colors.success };
      case 'cancelled':
        return { name: 'close-circle', library: 'Ionicons', color: colors.error };
      default:
        return { name: 'time', library: 'Ionicons', color: colors.text.secondary };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'preparing':
        return t('preparing');
      case 'on_the_way':
        return t('onTheWay');
      case 'delivered':
        return t('delivered');
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing';
    }
  };

  const renderOrderCard = (order, isOngoing = false) => {
    const statusIcon = getStatusIcon(order.status);

    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
        activeOpacity={0.7}
        onPress={() => isOngoing ? navigation.navigate('TrackOrder', { orderId: order.id }) : null}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <Image
            source={order.restaurantImage}
            style={[styles.restaurantImage, { backgroundColor: colors.background }]}
            resizeMode="cover"
          />
          <View style={styles.orderHeaderInfo}>
            <Text style={[styles.restaurantName, { color: colors.text.primary }]}>{order.restaurantName}</Text>
            <Text style={[styles.orderNumber, { color: colors.text.secondary }]}>{order.orderNumber}</Text>
            <Text style={[styles.orderDateTime, { color: colors.text.light }]}>
              {order.orderDate} • {order.orderTime}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.orderItems, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.itemsText, { color: colors.text.secondary }]}>
            {order.items.join(', ')}
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
              {getStatusText(order.status)}
            </Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.text.primary }]}>€{order.totalAmount}</Text>
        </View>

        {/* Estimated Time for Ongoing Orders */}
        {isOngoing && order.estimatedTime && (
          <View style={[styles.estimatedTimeContainer, { borderTopColor: colors.border }]}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.estimatedTimeText, { color: colors.primary }]}>
              {t('estimated')} {t('deliveryTime')}: {order.estimatedTime}
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
            {mockOrders.ongoing.length > 0 && (
              <View style={[styles.badge, { backgroundColor: activeTab === 'ongoing' ? colors.text.white : colors.primary }]}>
                <Text style={[styles.badgeText, { color: activeTab === 'ongoing' ? colors.primary : colors.text.white }]}>{mockOrders.ongoing.length}</Text>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'ongoing' ? (
            mockOrders.ongoing.length > 0 ? (
              mockOrders.ongoing.map(order => renderOrderCard(order, true))
            ) : (
              renderEmptyState('ongoing')
            )
          ) : (
            mockOrders.history.length > 0 ? (
              mockOrders.history.map(order => renderOrderCard(order, false))
            ) : (
              renderEmptyState('history')
            )
          )}
        </ScrollView>
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
