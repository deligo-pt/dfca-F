import messaging from '@react-native-firebase/messaging';
import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';
import { customerApi } from '../utils/api';

class FirebaseNotificationService {
    constructor() {
        this.sound = null;
        this.unsubscribeOnMessage = null;
        this.unsubscribeOnNotificationOpened = null;
        this.fcmToken = null;
    }

    /**
     * Initialize Firebase messaging service
     */
    async initialize() {
        try {
            // Check permission status (handled in PermissionsScreen)
            const authStatus = await messaging().hasPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            // Load notification sound regardless of permission (prepare for later)
            await this.loadNotificationSound();

            // Set up message handlers regardless of permission (they'll work once permission is granted)
            this.setupMessageHandlers();

            if (!enabled) {
                console.log('Firebase messaging permission not enabled yet - handlers set up, waiting for permission');
                // Return true to indicate partial initialization is done
                // Token registration will happen via reinitializeAfterPermission()
                return true;
            }

            // Get FCM token only if permission is already granted
            await this.getFCMToken();

            console.log('Firebase notification service initialized successfully with token');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase notification service:', error);
            return false;
        }
    }

    /**
     * Reinitialize after permission is granted - call this from PermissionsScreen
     */
    async reinitializeAfterPermission() {
        try {
            console.log('Reinitializing Firebase notification service after permission grant...');

            // Get FCM token now that permission is granted
            const token = await this.getFCMToken();

            if (token) {
                // Register token with backend immediately
                await this.registerTokenWithBackend(token);
                console.log('FCM token registered after permission grant');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error reinitializing after permission:', error);
            return false;
        }
    }

    /**
     * Get FCM token and register with backend
     */
    async getFCMToken() {
        try {
            // Check if we already have a token
            this.fcmToken = await messaging().getToken();
            console.log('FCM Token:', this.fcmToken);

            // Listen for token refresh
            messaging().onTokenRefresh(async (newToken) => {
                console.log('FCM Token refreshed:', newToken);
                this.fcmToken = newToken;
                await this.registerTokenWithBackend(newToken);
            });

            return this.fcmToken;
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    async registerTokenWithBackend(token) {
        try {
            const payload = {
                fcmToken: token,
                token: token, // Fallback key
                deviceToken: token, // Another common fallback
                platform: Platform.OS,
            };
            console.log('Registering FCM token with backend:', payload);

            await customerApi.post('/auth/save-fcm-token', payload);
            console.log('FCM token registered with backend');
        } catch (error) {
            console.error('Error registering FCM token with backend:', error);
        }
    }

    /**
     * Load custom notification sound
     */
    async loadNotificationSound() {
        try {
            // Load custom sound if available
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/notification-sound.wav'),
                { shouldPlay: false }
            );
            this.sound = sound;
            console.log('Custom notification sound loaded');
        } catch (error) {
            console.log('Custom sound not found, will use system default:', error.message);
            this.sound = null;
        }
    }

    /**
     * Play notification sound and vibrate
     */
    async playNotificationSound() {
        try {
            // Vibrate
            Vibration.vibrate();

            if (this.sound) {
                await this.sound.replayAsync();
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    /**
     * Setup Firebase message handlers
     */
    setupMessageHandlers() {
        // Handle foreground messages
        this.unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
            console.log('Foreground notification received:', remoteMessage);

            // Play custom sound for foreground notifications
            await this.playNotificationSound();

            // Notify the app about the new notification
            if (this.onNotificationReceived) {
                this.onNotificationReceived(remoteMessage);
            }
        });

        // Handle notification opened from background/quit state
        messaging().onNotificationOpenedApp((remoteMessage) => {
            console.log('Notification opened from background:', remoteMessage);
            if (this.onNotificationOpened) {
                this.onNotificationOpened(remoteMessage);
            }
        });

        // Check if app was opened from a notification (quit state)
        messaging()
            .getInitialNotification()
            .then((remoteMessage) => {
                if (remoteMessage) {
                    console.log('App opened from quit state by notification:', remoteMessage);
                    if (this.onNotificationOpened) {
                        this.onNotificationOpened(remoteMessage);
                    }
                }
            });
    }

    /**
     * Set notification callbacks
     */
    setNotificationCallbacks(onReceived, onOpened) {
        this.onNotificationReceived = onReceived;
        this.onNotificationOpened = onOpened;
    }

    /**
     * Fetch notifications from API
     */
    async fetchNotifications() {
        try {
            const response = await customerApi.get('/notifications/my-notifications');
            // Interceptor returns res.data, so response IS the data object
            console.log('Fetched notifications response:', response);

            if (response?.success && Array.isArray(response?.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                // Fallback if backend returns direct array
                return response;
            }

            return [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
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
     * Get unread notification count
     */
    async getUnreadCount() {
        try {
            const notifications = await this.fetchNotifications();
            return notifications.filter(n => !n.isRead).length;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Subscribe to a topic (for targeted notifications)
     */
    async subscribeToTopic(topic) {
        try {
            await messaging().subscribeToTopic(topic);
            console.log(`Subscribed to topic: ${topic}`);
        } catch (error) {
            console.error(`Error subscribing to topic ${topic}:`, error);
        }
    }

    /**
     * Unsubscribe from a topic
     */
    async unsubscribeFromTopic(topic) {
        try {
            await messaging().unsubscribeFromTopic(topic);
            console.log(`Unsubscribed from topic: ${topic}`);
        } catch (error) {
            console.error(`Error unsubscribing from topic ${topic}:`, error);
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.unsubscribeOnMessage) {
            this.unsubscribeOnMessage();
        }

        if (this.sound) {
            await this.sound.unloadAsync();
            this.sound = null;
        }
    }
}

// Export singleton instance
export default new FirebaseNotificationService();
