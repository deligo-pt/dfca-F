import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';

import App from './App';

// Create notification channel for Android (must match backend's channel ID)
if (Platform.OS === 'android') {
    notifee.createChannel({
        id: 'default_channel',
        name: 'DeliGo Order Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'notification_sound', // Links to res/raw/notification_sound.wav
        vibration: true,
        vibrationPattern: [300, 500],
    }).then(() => console.log('[Notifee] default_channel created with custom sound'));
}

// Background message handler - uses Notifee to display notifications with custom sound
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Firebase] 📥 Background message received:', remoteMessage.messageId);

    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};

    const title = notification.title || data.title || 'DeliGo';
    const body = notification.body || data.body || data.message || 'You have a new notification';

    // Display notification using Notifee (plays custom sound from res/raw/)
    await notifee.displayNotification({
        title: title,
        body: body,
        data: data,
        android: {
            channelId: 'default_channel',
            sound: 'notification_sound',
            smallIcon: 'ic_launcher', // App icon in notification bar
            largeIcon: 'ic_launcher_round', // DeliGo logo (large, circular)
            color: '#DC3173', // DeliGo brand color
            pressAction: {
                id: 'default',
            },
            importance: AndroidImportance.HIGH,
            vibrationPattern: [300, 500],
            showTimestamp: true,
            style: {
                type: AndroidStyle.BIGTEXT,
                text: body,
            },
        },
    });

    console.log('[Notifee] Background notification displayed with DeliGo logo');
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
