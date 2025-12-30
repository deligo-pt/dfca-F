import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../utils/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import NotificationPopup from './NotificationPopup';

const NotificationOverlay = () => {
  const { latestNotification, showPopup, dismissPopup, markAsRead } = useNotifications();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (notification._id && !notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.type === 'ORDER' && notification.data?.orderId) {
      // Navigate to TrackOrder screen
      navigation.navigate('TrackOrder', { orderId: notification.data.orderId });
    } else {
      // Navigate to notifications screen
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

