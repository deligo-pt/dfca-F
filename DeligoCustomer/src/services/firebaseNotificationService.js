/**
 * Firebase Notification Service
 * Handles all native Firebase Cloud Messaging operations for DeliGo Customer
 * Implements foreground (toast + custom sound) and background/killed (native sound) notifications
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { navigate } from '../navigation/navigationRef';
import { customerApi } from '../utils/api';

const FCM_TOKEN_KEY = '@deligo_customer_fcm_token';
const NOTIFICATION_CHANNEL_ID = 'default_channel'; // Match backend

class FirebaseNotificationService {
    constructor() {
        this.fcmToken = null;
        this.unsubscribeOnMessage = null;
        this.unsubscribeOnNotificationOpened = null;
        this.onNotificationReceivedCallback = null;
        this.onNotificationOpenedCallback = null;
    }

    /**
     * Set callbacks for notification events
     */
    setNotificationCallbacks(onNotificationReceived, onNotificationOpened) {
        this.onNotificationReceivedCallback = onNotificationReceived;
        this.onNotificationOpenedCallback = onNotificationOpened;
        console.log('[Firebase] Notification callbacks set');
    }

    /**
     * Create notification channel with custom sound for Android
     */
    async createNotificationChannel() {
        if (Platform.OS === 'android') {
            try {
                await notifee.createChannel({
                    id: NOTIFICATION_CHANNEL_ID,
                    name: 'DeliGo Order Notifications',
                    importance: AndroidImportance.HIGH,
                    sound: 'notification_sound', // Links to res/raw/notification_sound.wav
                    vibration: true,
                    vibrationPattern: [300, 500],
                });
                console.log('[Firebase] ✅ Notification channel created with custom sound');
            } catch (error) {
                console.error('[Firebase] ❌ Create channel error:', error);
            }
        }
    }

    /**
     * Initialize Firebase Messaging
     * Should be called once on app startup
     */
    async initialize() {
        try {
            console.log('[Firebase] Initializing...');

            if (!messaging) {
                console.warn('[Firebase] Firebase messaging not available');
                return null;
            }

            // Create notification channel with custom sound
            await this.createNotificationChannel();

            // Note: Background handler is registered in index.js (must be outside React lifecycle)

            // Set up foreground message handler
            this.setupForegroundHandler();

            // Set up notification opened handler
            this.setupNotificationOpenedHandler();

            // Check initial notification
            await this.checkInitialNotification();

            console.log('[Firebase] ✅ Initialized successfully');
            return true;
        } catch (error) {
            console.error('[Firebase] ❌ Initialization error:', error);
            return false;
        }
    }

    /**
     * Check notification permission status
     */
    async checkPermission() {
        try {
            const authStatus = await messaging().hasPermission();

            if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
                return 'granted';
            }

            if (authStatus === messaging.AuthorizationStatus.DENIED) {
                return 'denied';
            }

            return 'undetermined';
        } catch (error) {
            console.error('[Firebase] Check permission error:', error);
            return 'undetermined';
        }
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        try {
            console.log('[Firebase] Requesting permission...');

            // For Android 13+
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('[Firebase] Android 13+ permission denied');
                    return false;
                }
            }

            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            console.log('[Firebase] Permission:', enabled ? '✅ granted' : '❌ denied');
            return enabled;
        } catch (error) {
            console.error('[Firebase] Request permission error:', error);
            return false;
        }
    }

    /**
     * Get FCM token
     */
    async getToken() {
        try {
            const permissionStatus = await this.checkPermission();
            if (permissionStatus !== 'granted') {
                console.log('[Firebase] Cannot get token - no permission');
                return null;
            }

            const token = await messaging().getToken();

            if (token) {
                this.fcmToken = token;
                await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
                console.log('[Firebase] 🔑 FCM Token:', token.substring(0, 20) + '...');
            }

            return token;
        } catch (error) {
            console.error('[Firebase] Get token error:', error);
            return null;
        }
    }

    /**
     * Get stored FCM token
     */
    async getStoredToken() {
        try {
            const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
            return token;
        } catch (error) {
            console.error('[Firebase] Get stored token error:', error);
            return null;
        }
    }

    /**
     * Register FCM token with backend
     */
    async registerTokenWithBackend(token) {
        try {
            const payload = {
                fcmToken: token,
                token: token,
                deviceToken: token,
                platform: Platform.OS,
            };
            console.log('[Firebase] Registering token with backend...');
            console.log('[Firebase] Payload:', JSON.stringify(payload, null, 2));

            const response = await customerApi.post('/auth/save-fcm-token', payload);

            console.log('[Firebase] ✅ Token registered with backend');
            console.log('[Firebase] Backend response:', JSON.stringify(response.data, null, 2));

            return response.data;
        } catch (error) {
            console.error('[Firebase] ❌ Register token error:', error);
            console.error('[Firebase] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            return null;
        }
    }

    /**
     * Setup foreground message handler (plays custom sound from assets)
     */
    setupForegroundHandler() {
        console.log('[Firebase] Setting up foreground message handler...');
        this.unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
            console.log('[Firebase] 📬 Foreground Message:', remoteMessage);

            const notification = remoteMessage.notification || {};
            const data = remoteMessage.data || {};

            const title = notification.title || data.title || 'New Notification';
            const body = notification.body || data.body || data.message || '';

            // Play custom sound from assets (expo-av)
            try {
                const SoundService = (await import('../utils/SoundService')).default;
                await SoundService.playNotificationSound();
            } catch (e) {
                console.warn('[Firebase] Sound play error:', e);
            }

            // Call external callback
            if (this.onNotificationReceivedCallback) {
                try {
                    this.onNotificationReceivedCallback(remoteMessage);
                } catch (e) {
                    console.warn('[Firebase] Callback error:', e);
                }
            }

            // Show custom toast notification
            try {
                const Toast = (await import('react-native-toast-message')).default;
                Toast.show({
                    type: 'deligoToast',
                    text1: title,
                    text2: body,
                    visibilityTime: 4000,
                    onPress: () => {
                        this.handleNotificationNavigation(data);
                        Toast.hide();
                    }
                });
            } catch (e) {
                console.warn('[Firebase] Toast error:', e);
            }
        });
    }

    /**
     * Setup notification opened handler
     */
    setupNotificationOpenedHandler() {
        this.unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
            console.log('[Firebase] 👆 Notification Opened:', remoteMessage);
            const data = remoteMessage.data || {};

            if (this.onNotificationOpenedCallback) {
                try {
                    this.onNotificationOpenedCallback(remoteMessage);
                } catch (e) {
                    console.warn('[Firebase] Opened callback error:', e);
                }
            }

            this.handleNotificationNavigation(data);
        });
    }

    /**
     * Check if app was opened from notification (killed state)
     */
    async checkInitialNotification() {
        try {
            const remoteMessage = await messaging().getInitialNotification();

            if (remoteMessage) {
                console.log('[Firebase] 🚀 Initial Notification:', remoteMessage);
                const data = remoteMessage.data || {};

                if (this.onNotificationOpenedCallback) {
                    try {
                        this.onNotificationOpenedCallback(remoteMessage);
                    } catch (e) {
                        console.warn('[Firebase] Initial callback error:', e);
                    }
                }

                // Delay navigation to ensure app is fully loaded
                setTimeout(() => {
                    this.handleNotificationNavigation(data);
                }, 1000);
            }
        } catch (error) {
            console.error('[Firebase] Check initial notification error:', error);
        }
    }

    /**
     * Handle navigation based on notification data
     */
    handleNotificationNavigation(data) {
        const type = data?.type || '';
        const orderId = data?.orderId;

        console.log('[Firebase] 🧭 Navigating for type:', type, 'orderId:', orderId);

        if (orderId) {
            // Navigate to order tracking if orderId exists
            navigate('TrackOrder', { orderId });
        } else if (type === 'PROMO' || type === 'PROMOTION') {
            navigate('Vouchers');
        } else if (type === 'CHAT' && data.chatId) {
            navigate('Chat', { chatId: data.chatId });
        } else {
            // Default to notifications screen
            navigate('Notifications');
        }
    }

    /**
     * Fetch notifications from API
     */
    async fetchNotifications() {
        try {
            const response = await customerApi.get('/notifications/my-notifications');
            if (response?.success && Array.isArray(response?.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        } catch (error) {
            console.error('[Firebase] Fetch notifications error:', error);
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
            console.error('[Firebase] Mark as read error:', error);
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
            console.error('[Firebase] Get unread count error:', error);
            return 0;
        }
    }

    /**
     * Subscribe to topic for targeted notifications
     */
    async subscribeToTopic(topic) {
        try {
            await messaging().subscribeToTopic(topic);
            console.log(`[Firebase] ✅ Subscribed to topic: ${topic}`);
            return true;
        } catch (error) {
            console.error('[Firebase] Subscribe error:', error);
            return false;
        }
    }

    /**
     * Unsubscribe from topic
     */
    async unsubscribeFromTopic(topic) {
        try {
            await messaging().unsubscribeFromTopic(topic);
            console.log(`[Firebase] ✅ Unsubscribed from topic: ${topic}`);
            return true;
        } catch (error) {
            console.error('[Firebase] Unsubscribe error:', error);
            return false;
        }
    }

    /**
     * Clean up listeners
     */
    cleanup() {
        if (this.unsubscribeOnMessage) {
            this.unsubscribeOnMessage();
            this.unsubscribeOnMessage = null;
        }
        if (this.unsubscribeOnNotificationOpened) {
            this.unsubscribeOnNotificationOpened();
            this.unsubscribeOnNotificationOpened = null;
        }
        console.log('[Firebase] 🧹 Cleaned up');
    }

    /**
     * Delete token (for logout)
     */
    async deleteToken() {
        try {
            await messaging().deleteToken();
            await AsyncStorage.removeItem(FCM_TOKEN_KEY);
            this.fcmToken = null;
            console.log('[Firebase] 🗑️ Token deleted');
            return true;
        } catch (error) {
            console.error('[Firebase] Delete token error:', error);
            return false;
        }
    }
    /**
     * Re-initialize after permission granted during onboarding
     */
    async reinitializeAfterPermission() {
        console.log('[Firebase] Re-initializing after permission grant...');
        // Channels need creating
        await this.createNotificationChannel();
        
        // Get and register token
        const token = await this.getToken();
        if (token) {
            await this.registerTokenWithBackend(token);
        }
        
        // Setup handlers
        this.setupForegroundHandler();
        this.setupNotificationOpenedHandler();
        
        return true;
    }
}

// Export singleton instance
const firebaseNotificationService = new FirebaseNotificationService();
export default firebaseNotificationService;

