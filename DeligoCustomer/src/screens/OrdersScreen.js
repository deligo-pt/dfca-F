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
import { colors } from '../theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Mock data for orders
const mockOrders = {
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

const OrdersScreen = () => {
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
        return 'Preparing your order';
      case 'on_the_way':
        return 'On the way';
      case 'delivered':
        return 'Delivered';
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
        style={styles.orderCard}
        activeOpacity={0.7}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <Image
            source={order.restaurantImage}
            style={styles.restaurantImage}
            resizeMode="cover"
          />
          <View style={styles.orderHeaderInfo}>
            <Text style={styles.restaurantName}>{order.restaurantName}</Text>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDateTime}>
              {order.orderDate} • {order.orderTime}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.orderItems}>
          <Text style={styles.itemsText}>
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
          <Text style={styles.totalAmount}>৳{order.totalAmount}</Text>
        </View>

        {/* Estimated Time for Ongoing Orders */}
        {isOngoing && order.estimatedTime && (
          <View style={styles.estimatedTimeContainer}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.estimatedTimeText}>
              Estimated time: {order.estimatedTime}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOngoing ? (
            <>
              <TouchableOpacity style={styles.trackButton}>
                <Ionicons name="location" size={18} color={colors.text.white} />
                <Text style={styles.trackButtonText}>Track Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpButton}>
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.helpButtonText}>Help</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.reorderButton}>
                <MaterialIcons name="replay" size={18} color={colors.primary} />
                <Text style={styles.reorderButtonText}>Reorder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reviewButton}>
                <Ionicons name="star-outline" size={18} color={colors.primary} />
                <Text style={styles.reviewButtonText}>Rate</Text>
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
      <Text style={styles.emptyStateTitle}>
        {type === 'ongoing' ? 'No ongoing orders' : 'No order history'}
      </Text>
      <Text style={styles.emptyStateText}>
        {type === 'ongoing'
          ? 'Your active orders will appear here'
          : 'Your past orders will appear here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>My Orders</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ongoing' && styles.activeTab]}
            onPress={() => setActiveTab('ongoing')}
          >
            <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>
              Ongoing
            </Text>
            {mockOrders.ongoing.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{mockOrders.ongoing.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.white,
  },
  badge: {
    backgroundColor: colors.text.white,
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
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: colors.text.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  orderHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  orderDateTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.text.light,
  },
  orderItems: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  estimatedTimeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.primary,
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
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.white,
    marginLeft: 6,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.text.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginLeft: 6,
  },
  reorderButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.text.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  reorderButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginLeft: 6,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.text.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  reviewButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
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
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default OrdersScreen;
