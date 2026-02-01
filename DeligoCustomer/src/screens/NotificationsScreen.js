/**
 * NotificationsScreen
 * 
 * Central hub for all user notifications (Orders, Promos, System).
 * Features:
 * - Real-time updates via NotificationContext.
 * - Filtering by type (All/Unread/Orders/Promos).
 * - Detailed modal view for specific notifications.
 * - Deep linking to relevant screens (e.g., TrackOrder).
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation controller.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'order', label: 'Orders' },
  { key: 'promo', label: 'Promos' },
];

const NotificationsScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Refresh notifications when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshNotifications();
    });

    return unsubscribe;
  }, [navigation, refreshNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const getNotificationConfig = (notification) => {
    const type = notification.type?.toUpperCase() || 'ORDER';
    const status = notification.data?.status || notification.data?.orderStatus;
    const title = notification.title?.toLowerCase() || '';

    // Status-based icons
    if (type === 'ORDER' && status) {
      switch (status) {
        case 'ACCEPTED':
          return { icon: 'checkmark-circle', color: '#4CAF50', gradient: ['#4CAF50', '#45a049'] };
        case 'PREPARING':
          return { icon: 'restaurant', color: '#FF9800', gradient: ['#FF9800', '#F57C00'] };
        case 'READY_FOR_PICKUP':
          return { icon: 'bag-checked', color: '#2196F3', gradient: ['#2196F3', '#1976D2'], library: 'MaterialCommunityIcons' };
        case 'PICKED_UP':
          return { icon: 'bicycle', color: '#9C27B0', gradient: ['#9C27B0', '#7B1FA2'], library: 'MaterialCommunityIcons' };
        case 'ON_THE_WAY':
          return { icon: 'motorbike', color: '#00BCD4', gradient: ['#00BCD4', '#0097A7'], library: 'MaterialCommunityIcons' };
        case 'DELIVERED':
          return { icon: 'package-variant-closed-check', color: '#4CAF50', gradient: ['#4CAF50', '#388E3C'], library: 'MaterialCommunityIcons' };
        default:
          break;
      }
    }

    // Title-based detection
    if (title.includes('accepted')) {
      return { icon: 'checkmark-circle', color: '#4CAF50', gradient: ['#4CAF50', '#45a049'] };
    }
    if (title.includes('rejected') || title.includes('canceled')) {
      return { icon: 'close-circle', color: '#F44336', gradient: ['#F44336', '#D32F2F'] };
    }
    if (title.includes('preparing')) {
      return { icon: 'restaurant', color: '#FF9800', gradient: ['#FF9800', '#F57C00'] };
    }
    if (title.includes('ready')) {
      return { icon: 'bag-checked', color: '#2196F3', gradient: ['#2196F3', '#1976D2'], library: 'MaterialCommunityIcons' };
    }
    if (title.includes('delivered')) {
      return { icon: 'package-variant-closed-check', color: '#4CAF50', gradient: ['#4CAF50', '#388E3C'], library: 'MaterialCommunityIcons' };
    }
    if (title.includes('on the way') || title.includes('on_the_way')) {
      return { icon: 'motorbike', color: '#00BCD4', gradient: ['#00BCD4', '#0097A7'], library: 'MaterialCommunityIcons' };
    }

    // Type-based fallbacks
    switch (type) {
      case 'ORDER':
        return { icon: 'cube', color: colors.primary, gradient: [colors.primary, colors.primary] };
      case 'PROMO':
        return { icon: 'pricetag', color: '#FF6B35', gradient: ['#FF6B35', '#E55A2B'] };
      case 'SYSTEM':
        return { icon: 'information-circle', color: '#607D8B', gradient: ['#607D8B', '#455A64'] };
      case 'ACCOUNT':
        return { icon: 'person-circle', color: '#3F51B5', gradient: ['#3F51B5', '#303F9F'] };
      default:
        return { icon: 'notifications', color: colors.primary, gradient: [colors.primary, colors.primary] };
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return t('justNow') || 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNotificationText = (text) => {
    if (!text) return '';
    return text
      .replace(/PICKED_UP/g, 'Picked Up')
      .replace(/ON_THE_WAY/g, 'On The Way')
      .replace(/READY_FOR_PICKUP/g, 'Ready For Pickup')
      .replace(/ACCEPTED/g, 'Accepted')
      .replace(/PREPARING/g, 'Preparing')
      .replace(/DELIVERED/g, 'Delivered')
      .replace(/COMPLETED/g, 'Completed')
      .replace(/CANCELED/g, 'Canceled')
      .replace(/REJECTED/g, 'Rejected')
      .replace(/PENDING/g, 'Pending');
  };

  const filteredNotifications = notifications.filter((notification) => {
    switch (activeFilter) {
      case 'unread':
        return !notification.isRead;
      case 'order':
        return notification.type?.toUpperCase() === 'ORDER';
      case 'promo':
        return notification.type?.toUpperCase() === 'PROMO';
      default:
        return true;
    }
  });

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Show full notification in modal
    setSelectedNotification({ ...notification, isRead: true });
    setModalVisible(true);
  };

  const handleViewOrder = () => {
    setModalVisible(false);
    if (selectedNotification?.data?.orderId) {
      navigation.navigate('TrackOrder', { orderId: selectedNotification.data.orderId });
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const styles = getStyles(colors);

  const FilterTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = tab.key === 'unread' ? unreadCount :
            tab.key === 'order' ? notifications.filter(n => n.type?.toUpperCase() === 'ORDER').length :
              tab.key === 'promo' ? notifications.filter(n => n.type?.toUpperCase() === 'PROMO').length :
                notifications.length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const NotificationItem = ({ item }) => {
    const config = getNotificationConfig(item);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Gradient Icon */}
        <LinearGradient
          colors={config.gradient}
          style={styles.iconGradient}
        >
          {config.library === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons name={config.icon} size={22} color="#FFFFFF" />
          ) : (
            <Ionicons name={config.icon} size={22} color="#FFFFFF" />
          )}
        </LinearGradient>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
              {formatNotificationText(item.title)}
            </Text>
            <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>{formatNotificationText(item.message)}</Text>
          {item.type && (
            <View style={[styles.typeTag, { backgroundColor: config.color + '15' }]}>
              <Text style={[styles.typeTagText, { color: config.color }]}>
                {item.type}
              </Text>
            </View>
          )}
        </View>

        {!item.isRead && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}

        <Ionicons name="chevron-forward" size={20} color={colors.text.light} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const NotificationModal = () => {
    if (!selectedNotification) return null;
    const config = getNotificationConfig(selectedNotification);

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Icon */}
            <LinearGradient
              colors={config.gradient}
              style={styles.modalIcon}
            >
              {config.library === 'MaterialCommunityIcons' ? (
                <MaterialCommunityIcons name={config.icon} size={40} color="#FFFFFF" />
              ) : (
                <Ionicons name={config.icon} size={40} color="#FFFFFF" />
              )}
            </LinearGradient>

            {/* Content */}
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {formatNotificationText(selectedNotification.title)}
            </Text>

            <Text style={[styles.modalDate, { color: colors.text.light }]}>
              {formatDate(selectedNotification.createdAt)}
            </Text>

            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalMessage, { color: colors.text.secondary }]}>
                {formatNotificationText(selectedNotification.message)}
              </Text>

              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <View style={styles.modalDataContainer}>
                  {Object.entries(selectedNotification.data).map(([key, value]) => (
                    <View key={key} style={styles.modalDataRow}>
                      <Text style={[styles.modalDataKey, { color: colors.text.light }]}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Text>
                      <Text style={[styles.modalDataValue, { color: colors.text.primary }]}>
                        {formatNotificationText(String(value))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Action Button */}
            {selectedNotification.type === 'ORDER' && selectedNotification.data?.orderId && (
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleViewOrder}
              >
                <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>View Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={48} color={colors.text.light} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        {activeFilter === 'unread' ? 'All Caught Up!' : t('noNotifications') || 'No Notifications'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
        {activeFilter === 'unread'
          ? 'You have no unread notifications.'
          : t('noNotificationsDesc') || "Check back later for updates."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('notifications') || 'Notifications'}</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Ionicons name="checkmark-done" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <FilterTabs />

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => (
            <NotificationItem key={item._id} item={item} />
          ))
        ) : (
          <EmptyState />
        )}
      </ScrollView>

      {/* Notification Detail Modal */}
      <NotificationModal />
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.secondary,
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  unreadItem: {
    backgroundColor: colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadTitle: {
    fontFamily: 'Poppins-SemiBold',
  },
  time: {
    fontSize: 11,
    color: colors.text.light,
    fontFamily: 'Poppins-Regular',
  },
  message: {
    fontSize: fontSize.sm - 1,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    lineHeight: 18,
    marginBottom: 6,
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingTop: spacing.md,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalDate: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  modalBody: {
    maxHeight: 200,
  },
  modalMessage: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    lineHeight: 24,
  },
  modalDataContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  modalDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  modalDataKey: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
  },
  modalDataValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default NotificationsScreen;
