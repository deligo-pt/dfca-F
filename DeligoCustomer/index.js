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
// IMPORTANT: The 'default_channel' MUST match the backend's channelId
if (Platform.OS === 'android') {
    // Create 'default_channel' with HEADS-UP settings (matches backend channelId)
    // This is the primary channel for all push notifications
    Notifications.setNotificationChannelAsync('default_channel', {
        name: 'Deligo Notifications',
        description: 'Order updates and important alerts',
        importance: Notifications.AndroidImportance.MAX, // Required for heads-up
        vibrationPattern: [0, 500, 200, 500], // Strong vibration for visibility
        lightColor: '#DC3173',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Show even in Do Not Disturb
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
    }).then(() => console.log('default_channel created with heads-up settings'));

    // Create additional channel for app-specific local notifications
    Notifications.setNotificationChannelAsync('deligo_notifications_channel', {
        name: 'Deligo Orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#DC3173',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
    }).then(() => console.log('deligo_notifications_channel created successfully'));
}

// Register background handler for Firebase messaging
// This must be done before registerRootComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('=== BACKGROUND MESSAGE RECEIVED ===');
    console.log('Message ID:', remoteMessage.messageId);
    console.log('Has notification payload:', !!remoteMessage.notification);
    console.log('Has data payload:', !!remoteMessage.data);
    console.log('Full message:', JSON.stringify(remoteMessage, null, 2));

    // For data-only messages (no notification payload), we need to show a local notification
    // If the message has a notification payload, Firebase will show it automatically
    if (!remoteMessage.notification) {
        console.log('Data-only message - creating local notification');
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

        console.log('Scheduling local notification - Title:', title, 'Body:', body);

        // Schedule the local notification to show as heads-up
        // Using 'default_channel' to match backend's channelId (now has heads-up settings)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                data: data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                color: '#DC3173',
                channelId: 'default_channel', // Match backend's channelId
                vibrate: [0, 500, 200, 500],
                autoDismiss: true,
                sticky: false,
            },
            trigger: null, // Show immediately = heads-up display
        });

        console.log('Local notification scheduled on default_channel');
    } else {
        console.log('Notification payload present - Firebase will display automatically');
        console.log('Title:', remoteMessage.notification.title);
        console.log('Body:', remoteMessage.notification.body);
    }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
