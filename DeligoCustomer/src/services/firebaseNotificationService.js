import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';
import { customerApi } from '../utils/api';
import Toast from 'react-native-toast-message';

class FirebaseNotificationService {
    constructor() {
        this.sound = null;
        this.unsubscribeOnMessage = null;
        this.unsubscribeOnNotificationOpened = null;
        this.fcmToken = null;
        this.onNotificationReceived = null;
        this.onNotificationOpened = null;
        this.channelId = 'deligo_notifications_channel'; // Use consistent channel ID
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

            // Set up Expo Notifications handler
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });

            // Create notification channel for Android
            if (Platform.OS === 'android') {
                await this.createNotificationChannel();
            }

            // Set up message handlers regardless of permission (they'll work once permission is granted)
            this.setupMessageHandlers();

            if (!enabled) {
                console.log('Firebase messaging permission not enabled yet - handlers set up, waiting for permission');
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
     * Create notification channel for Android
     */
    async createNotificationChannel() {
        try {
            // Create 'default' channel (legacy)
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });

            // Create 'default_channel' (new standard from backend)
            await Notifications.setNotificationChannelAsync('default_channel', {
                name: 'Default Channel',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#DC3173', // Using the app's primary pink color
            });
            console.log('Notification channels created');
        } catch (error) {
            console.error('Error creating notification channel:', error);
        }
    }

    /**
     * Load custom notification sound
     */
    async loadNotificationSound() {
        // Deprecated: We create sound on demand to avoid threading issues
    }

    /**
     * Play notification sound and vibrate
     */
    async playNotificationSound() {
        try {
            // Vibrate
            Vibration.vibrate();

            // Play sound on demand to ensure thread safety
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/notification_sound.wav'),
                { shouldPlay: true }
            );

            // Unload sound from memory when playback finishes
            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.didJustFinish) {
                    await sound.unloadAsync();
                }
            });
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

            // Extract notification data
            const notification = remoteMessage.notification || {};
            const data = remoteMessage.data || {};

            const title = notification.title || data.title || 'New Notification';
            const body = notification.body || data.body || data.message || '';

            // Play custom sound for foreground notifications
            await this.playNotificationSound();

            // Show Toast notification (professional in-app notification like Pathao/Uber)
            const toastType = data.type === 'ORDER' || data.orderId ? 'orderToast' : 'deligoToast';

            // Show toast immediately using setTimeout to ensure it runs on the next tick
            // This helps avoid issues where the UI thread might be busy or the component not ready
            setTimeout(() => {
                Toast.show({
                    type: toastType,
                    text1: title,
                    text2: body,
                    visibilityTime: 5000,
                    autoHide: true,
                    topOffset: 50,
                    onPress: () => {
                        // Handle tap on notification - can navigate to order details
                        if (this.onNotificationOpened) {
                            this.onNotificationOpened(remoteMessage);
                        }
                        Toast.hide();
                    },
                });
            }, 100);

            // Notify the app about the new notification (for state updates)
            // We do this immediately to ensure UI updates
            if (this.onNotificationReceived) {
                console.log('Calling onNotificationReceived callback');
                // Wrap in setTimeout to ensure it runs in the next tick, potentially helping with state updates
                setTimeout(() => {
                    this.onNotificationReceived(remoteMessage);
                }, 100);
            } else {
                console.warn('onNotificationReceived callback not set');
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
        console.log('Setting notification callbacks');
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
            // console.log('Fetched notifications response:', response);

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
