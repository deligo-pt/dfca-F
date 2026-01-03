import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

import App from './App';

// Register background handler for Firebase messaging
// This must be done before registerRootComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message received:', remoteMessage);

    // If the message is data-only (no notification payload), schedule a local notification
    if (!remoteMessage.notification) {
        const { title, body, message } = remoteMessage.data || {};

        if (title && (body || message)) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: title,
                    body: body || message,
                    data: remoteMessage.data,
                    sound: true,
                    vibrate: [0, 250, 250, 250],
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    color: '#DC3173',
                    channelId: 'default',
                },
                trigger: null, // Show immediately
            });
        }
    }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

