import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { customerApi } from '../utils/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.sound = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.pollingInterval = null;
    this.lastNotificationId = null;
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      // Load notification sound
      await this.loadNotificationSound();

      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  /**
   * Load custom notification sound
   */
  async loadNotificationSound() {
    try {
      // Try to load custom sound if available
      // For now, we'll use system default sound
      // To use custom sound, add notification.mp3 to assets/sounds/
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../assets/sounds/notification.mp3'),
      //   { shouldPlay: false }
      // );
      // this.sound = sound;
      console.log('Using system default notification sound');
    } catch (error) {
      console.log('Using system default sound:', error.message);
    }
  }

  /**
   * Play notification sound
   */
  async playNotificationSound() {
    try {
      if (this.sound) {
        await this.sound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Show local notification with sound
   */
  async showNotification(notification) {
    try {
      // Play sound
      await this.playNotificationSound();

      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: notification.data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Fetch notifications from API
   */
  async fetchNotifications() {
    try {
      const response = await customerApi.get('/notifications/my-notifications');

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Start polling for new notifications every 1 second
   */
  startPolling(callback, interval = 1000) {
    // Stop any existing polling
    this.stopPolling();

    console.log(`[NotificationService] Starting notification polling every ${interval}ms (${interval/1000}s)`);

    // Initial fetch
    this.checkForNewNotifications(callback);

    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.checkForNewNotifications(callback);
    }, interval);
  }

  /**
   * Check for new notifications and show popup
   */
  async checkForNewNotifications(callback) {
    try {
      const notifications = await this.fetchNotifications();

      if (notifications && notifications.length > 0) {
        const latestNotification = notifications[0];

        // Check if this is a new notification
        if (latestNotification._id !== this.lastNotificationId) {
          this.lastNotificationId = latestNotification._id;

          // Show notification popup and play sound
          await this.showNotification(latestNotification);

          // Call callback with notification data
          if (callback) {
            callback(latestNotification, notifications);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Stopped notification polling');
    }
  }

  /**
   * Set up notification listeners
   */
  setupListeners(onNotificationReceived, onNotificationTapped) {
    // Listener for when notification is received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when user taps notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const notification = response.notification.request.content;
      if (onNotificationTapped) {
        onNotificationTapped(notification);
      }
    });
  }

  /**
   * Remove notification listeners
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      await customerApi.patch(`/notifications/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get badge count (unread notifications)
   */
  async getBadgeCount() {
    try {
      const notifications = await this.fetchNotifications();
      return notifications.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount() {
    try {
      const count = await this.getBadgeCount();
      await Notifications.setBadgeCountAsync(count);
      return count;
    } catch (error) {
      console.error('Error updating badge count:', error);
      return 0;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.stopPolling();
    this.removeListeners();

    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

// Export singleton instance
export default new NotificationService();

