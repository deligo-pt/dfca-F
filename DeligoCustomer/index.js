import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import App from './App';

// Set up Expo Notifications handler for background/foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Create notification channel for Android (needs to be done early)
if (Platform.OS === 'android') {
    // Create the default channel with high importance for background notifications
    Notifications.setNotificationChannelAsync('deligo_notifications_channel', {
        name: 'Deligo Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DC3173',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
    });

    // Create 'default_channel' as well since some notifications might come with this channel ID
    Notifications.setNotificationChannelAsync('default_channel', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DC3173',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
    });
}

// Register background handler for Firebase messaging
// This must be done before registerRootComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message received:', remoteMessage);

    // For data-only messages (no notification payload), we need to show a local notification
    // If the message has a notification payload, Firebase will show it automatically
    if (!remoteMessage.notification) {
        const data = remoteMessage.data || {};

        // Try to find title and body from various possible fields
        let title = data.title;
        let body = data.body || data.message;

        // If no explicit title, try to infer from type or status
        if (!title) {
            if (data.type === 'ORDER') {
                title = 'Order Update';
                if (data.status) {
                    // Format status: ORDER_ACCEPTED -> Order Accepted
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

        // If still no body, try to construct one
        if (!body) {
            if (data.orderId) {
                body = `Update for order #${data.orderId.slice(-6)}`;
            } else {
                body = 'You have a new update';
            }
        }

        // Schedule the local notification to show in system tray
        // Using scheduleNotificationAsync ensures it shows up even in background
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                data: data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                color: '#DC3173',
                channelId: 'deligo_notifications_channel',
                vibrate: [0, 250, 250, 250],
                autoDismiss: true,
                sticky: false,
            },
            trigger: null, // Show immediately
        });
    }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
