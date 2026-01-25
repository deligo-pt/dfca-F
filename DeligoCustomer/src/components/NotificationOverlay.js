import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../utils/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import NotificationPopup from './NotificationPopup';

/**
 * NotificationOverlay Component
 * 
 * Global notification handler rendering alerts over current screen content.
 * Subscribes to NotificationContext for real-time updates.
 */
const NotificationOverlay = () => {
  const { latestNotification, showPopup, dismissPopup, markAsRead } = useNotifications();
  const { colors } = useTheme();
  const navigation = useNavigation();

  /**
   * Handles user interaction with the notification popup.
   * - Marks the notification as read.
   * - Navigates to the specific content (e.g., Order Tracking) if applicable data exists.
   * - Defaults to the main Notifications hub if no specific data is present.
   * 
   * @param {Object} notification - The notification data object.
   */
  const handleNotificationPress = async (notification) => {
    // Mark as read immediately on interaction
    if (notification._id && !notification.isRead) {
      await markAsRead(notification._id);
    }

    // Direct navigation rationale
    if (notification.type === 'ORDER' && notification.data?.orderId) {
      navigation.navigate('TrackOrder', { orderId: notification.data.orderId });
    } else {
      navigation.navigate('Notifications');
    }
  };

  return (
    <NotificationPopup
      notification={latestNotification}
      visible={showPopup}
      onPress={handleNotificationPress}
      onDismiss={dismissPopup}
      colors={colors}
      duration={5000}
    />
  );
};

export default NotificationOverlay;
