import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen programmatically
 * @param {string} name - Screen name
 * @param {object} params - Screen params
 */
export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    }
}

/**
 * Go back to previous screen
 */
export function goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
    }
}

/**
 * Navigate to order tracking screen
 * @param {string} orderId - Order ID
 */
export function navigateToOrder(orderId) {
    if (navigationRef.isReady()) {
        navigationRef.navigate('TrackOrder', { orderId });
    }
}

/**
 * Navigate to notifications screen
 */
export function navigateToNotifications() {
    if (navigationRef.isReady()) {
        navigationRef.navigate('Notifications');
    }
}

