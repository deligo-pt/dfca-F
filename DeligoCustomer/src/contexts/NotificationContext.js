/**
 * NotificationContext Provider
 *
 * Manages the application's push notification system, including:
 * - Storing and retrieving local notification state.
 * - interacting with Firebase Messaging (FCM) through the service layer.
 * - Handling incoming notifications (foreground) and interactions (taps).
 * - Managing notification permission and token registration.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import firebaseNotificationService from '../services/firebaseNotificationService';
import { useProfile } from './ProfileContext';
import { navigateToOrder, navigateToNotifications } from '../navigation/navigationRef';

const NotificationContext = createContext();

/**
 * Hook to access the NotificationContext.
 * @returns {Object} The notification context value.
 * @throws {Error} If used outside of NotificationProvider.
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

/**
 * NotificationProvider Component
 * 
 * initializes the notification subsystem, registers listeners for foreground messages
 * and background taps, and syncs notification state with the backend.
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastFetchRef = React.useRef(0);

  const { isAuthenticated } = useProfile();

  /**
   * Callback handling foreground notifications.
   * Parses the payload to extract displayable title/message and updates local state.
   */
  const handleNotificationReceived = useCallback((remoteMessage) => {
    console.log('[NotificationContext] Received foreground message:', remoteMessage);

    const data = remoteMessage.data || {};
    let title = remoteMessage.notification?.title || data.title;
    let message = remoteMessage.notification?.body || data.body || data.message;

    // Fallback logic for constructing titles/messages if payload is raw data-only
    if (!title) {
      if (data.type === 'ORDER') {
        title = 'Order Update';
        if (data.status) {
          title = data.status.split('_').map(w =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          ).join(' ');
        }
      } else if (data.orderId) {
        title = 'Order Update';
      } else {
        title = 'New Notification';
      }
    }

    if (!message) {
      if (data.orderId) {
        message = `Update for order #${data.orderId.slice(-6)}`;
      } else {
        message = 'You have a new update';
      }
    }

    const notification = {
      _id: remoteMessage.messageId || Date.now().toString(),
      title,
      message,
      type: data.type || 'SYSTEM',
      data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Prevent duplicates and update state
    setNotifications(prev => {
      if (prev.some(n => n._id === notification._id)) return prev;
      return [notification, ...prev];
    });

    setLatestNotification(notification);
    setUnreadCount(prev => prev + 1);

    // Note: popup display is handled by the Toast logic in the service layer
    // triggering it here again would cause duplication.
  }, []);

  /**
   * Callback handling user interaction (tapping) on a notification.
   * Navigates the user to the appropriate screen based on payload type.
   */
  const handleNotificationOpened = useCallback((remoteMessage) => {
    console.log('[NotificationContext] Notification opened:', remoteMessage);

    const data = remoteMessage.data || {};
    const type = data.type || '';

    if ((type === 'ORDER' || data.orderId) && data.orderId) {
      console.log('[NotificationContext] Navigating to order:', data.orderId);
      navigateToOrder(data.orderId);
    } else {
      console.log('[NotificationContext] Navigating to notification center');
      navigateToNotifications();
    }
  }, []);

  /**
   * Initialize notification service and register callbacks on mount.
   */
  useEffect(() => {
    const init = async () => {
      try {
        firebaseNotificationService.setNotificationCallbacks(
          handleNotificationReceived,
          handleNotificationOpened
        );

        const success = await firebaseNotificationService.initialize();
        if (success) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[NotificationContext] Initialization error:', error);
      }
    };
    init();
    return () => { firebaseNotificationService.cleanup(); };
  }, [handleNotificationReceived, handleNotificationOpened]);

  /**
   * Handle authentication changes: fetch notifications and ensure FCM token is registered with backend.
   */
  /**
   * Fetch notifications when user logs in.
   * Separate effect to avoid re-fetching when initialization completes.
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      // Clear state on logout
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  /**
   * Handle FCM token registration when service is ready.
   */
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      (async () => {
        try {
          const permission = await firebaseNotificationService.checkPermission();
          console.log('[NotificationContext] Permission status:', permission);

          if (permission !== 'granted') {
            console.log('[NotificationContext] Requesting permission...');
            const granted = await firebaseNotificationService.requestPermission();
            if (!granted) {
              console.log('[NotificationContext] Permission denied');
              return;
            }
          }

          const token = await firebaseNotificationService.getToken();
          if (token) {
            console.log('[NotificationContext] Registering token...');
            // Check if token already registered to avoid redundant calls or check local storage?
            // For now, just register to ensure backend is in sync.
            const result = await firebaseNotificationService.registerTokenWithBackend(token);

            if (result) console.log('[NotificationContext] Backend registration successful');
            else console.warn('[NotificationContext] Backend registration failed/incomplete');
          } else {
            console.warn('[NotificationContext] Failed to retrieve FCM token');
          }
        } catch (error) {
          console.error('[NotificationContext] Token registration error:', error);
        }
      })();
    }
  }, [isAuthenticated, isInitialized]);

  /**
   * Re-fetch notifications when the application returns to the foreground.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('[NotificationContext] App active, refreshing notifications...');
        fetchNotifications();
      }
    });
    return () => { subscription.remove(); };
  }, [isAuthenticated, fetchNotifications]);

  /**
   * Fetches the latest notifications from the backend API.
   * @param {boolean} force - Whether to bypass the throttle.
   * @returns {Promise<Array>} The list of notifications.
   */
  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    // Throttle fetches to max once every 5 seconds to prevent 429 errors
    if (!force && now - lastFetchRef.current < 5000) {
      console.log('[NotificationContext] Skipping fetch, throttled');
      return [];
    }

    lastFetchRef.current = now;

    try {
      const data = await firebaseNotificationService.fetchNotifications();
      setNotifications(data);

      const unread = data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      return data;
    } catch (error) {
      console.error('[NotificationContext] Fetch error:', error);
      return [];
    }
  }, []);

  /**
   * Marks a single notification as read.
   * Optimistically updates local state before confirming with API.
   *
   * @param {string} notificationId - The ID of the notification to mark read.
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const success = await firebaseNotificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (error) {
      console.error('[NotificationContext] Error marking as read:', error);
      return false;
    }
  }, []);

  /**
   * Marks all current notifications as read.
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => firebaseNotificationService.markAsRead(n._id))
      );

      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('[NotificationContext] Error marking all as read:', error);
      return false;
    }
  }, [notifications]);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  const refreshNotifications = useCallback(async () => {
    return await fetchNotifications(true);
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
