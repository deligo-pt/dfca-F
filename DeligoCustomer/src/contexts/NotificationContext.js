import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import firebaseNotificationService from '../services/firebaseNotificationService';
import { useProfile } from './ProfileContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { isAuthenticated } = useProfile();

  // Initialize Firebase notification service
  useEffect(() => {
    const init = async () => {
      try {
        const success = await firebaseNotificationService.initialize();
        if (success) {
          setIsInitialized(true);

          // Set up notification callbacks
          firebaseNotificationService.setNotificationCallbacks(
            handleNotificationReceived,
            handleNotificationOpened
          );
        }
      } catch (error) {
        console.error('Error initializing notification service:', error);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      firebaseNotificationService.cleanup();
    };
  }, []);

  // Fetch notifications and register token when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();

      // Register FCM token
      if (isInitialized) {
        firebaseNotificationService.getFCMToken().then(token => {
          if (token) {
            firebaseNotificationService.registerTokenWithBackend(token);
          }
        });
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, isInitialized]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await firebaseNotificationService.fetchNotifications();
      setNotifications(data);

      // Update unread count
      const unread = data.filter(n => !n.isRead).length;
      setUnreadCount(unread);

      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }, []);

  // Handle foreground notification received
  const handleNotificationReceived = useCallback((remoteMessage) => {
    console.log('New notification received:', remoteMessage);

    // Parse notification data
    const notification = {
      _id: remoteMessage.messageId,
      title: remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification',
      message: remoteMessage.notification?.body || remoteMessage.data?.body || remoteMessage.data?.message || '',
      data: remoteMessage.data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Update state
    setNotifications(prev => [notification, ...prev]);
    setLatestNotification(notification);
    setShowPopup(true);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Handle notification opened (tapped)
  const handleNotificationOpened = useCallback((remoteMessage) => {
    console.log('Notification opened:', remoteMessage);

    // Navigate based on notification data if needed
    const data = remoteMessage.data;
    if (data?.orderId) {
      // TODO: Navigate to order details
      console.log('Should navigate to order:', data.orderId);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const success = await firebaseNotificationService.markAsRead(notificationId);
      if (success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );

        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);

      // Mark each unread notification as read
      await Promise.all(
        unreadNotifications.map(n => firebaseNotificationService.markAsRead(n._id))
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );

      // Reset unread count
      setUnreadCount(0);

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }, [notifications]);

  // Dismiss popup
  const dismissPopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    return await fetchNotifications();
  }, [fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    latestNotification,
    showPopup,
    isInitialized,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissPopup,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
