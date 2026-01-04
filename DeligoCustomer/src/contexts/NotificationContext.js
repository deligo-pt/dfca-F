import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import firebaseNotificationService from '../services/firebaseNotificationService';
import { useProfile } from './ProfileContext';
import { navigateToOrder, navigateToNotifications } from '../navigation/navigationRef';

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

  // Handle foreground notification received
  const handleNotificationReceived = useCallback((remoteMessage) => {
    console.log('New notification received in Context:', remoteMessage);

    // Parse notification data with robust fallbacks
    const data = remoteMessage.data || {};

    // Determine title
    let title = remoteMessage.notification?.title || data.title;
    if (!title) {
      if (data.type === 'ORDER') {
        title = 'Order Update';
        if (data.status) {
          title = data.status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }
      } else if (data.orderId) {
        title = 'Order Update';
      } else {
        title = 'New Notification';
      }
    }

    // Determine message/body
    let message = remoteMessage.notification?.body || data.body || data.message;
    if (!message) {
      if (data.orderId) {
        message = `Update for order #${data.orderId.slice(-6)}`;
      } else {
        message = 'You have a new update';
      }
    }

    const notification = {
      _id: remoteMessage.messageId || Date.now().toString(),
      title: title,
      message: message,
      type: data.type || 'SYSTEM',
      data: data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Update state immediately
    setNotifications(prev => {
      // Check if notification already exists to avoid duplicates
      if (prev.some(n => n._id === notification._id)) {
        return prev;
      }
      return [notification, ...prev];
    });
    
    setLatestNotification(notification);
    setUnreadCount(prev => prev + 1);
    
    // We rely on Toast in firebaseNotificationService for the visual popup
    // so we don't set showPopup(true) here to avoid double notifications.
    // setShowPopup(true); 
  }, []);

  // Handle notification opened (tapped)
  const handleNotificationOpened = useCallback((remoteMessage) => {
    console.log('Notification opened:', remoteMessage);

    // Navigate based on notification data
    const data = remoteMessage.data || {};
    const type = data.type || '';

    if ((type === 'ORDER' || data.orderId) && data.orderId) {
      console.log('Navigating to order:', data.orderId);
      // Navigate to order tracking screen
      navigateToOrder(data.orderId);
    } else {
      // For other notification types, go to notifications screen
      console.log('Navigating to notifications screen');
      navigateToNotifications();
    }
  }, []);

  // Initialize Firebase notification service
  useEffect(() => {
    const init = async () => {
      try {
        // Set callbacks BEFORE initializing to ensure we don't miss any messages
        firebaseNotificationService.setNotificationCallbacks(
            handleNotificationReceived,
            handleNotificationOpened
        );

        const success = await firebaseNotificationService.initialize();
        if (success) {
          setIsInitialized(true);
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
  }, [handleNotificationReceived, handleNotificationOpened]);

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

  // Refetch notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('App became active, fetching notifications...');
        fetchNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchNotifications]);

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
