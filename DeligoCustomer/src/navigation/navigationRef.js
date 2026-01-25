/**
 * Navigation Reference
 * 
 * Provides global access to the navigation container for non-component files using refs.
 * Useful for navigating from sagas, redux thunks, or outside the React component tree.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigates to a specific screen if the navigation container is mounted.
 * 
 * @param {string} name - The name of the route to navigate to.
 * @param {Object} [params] - Optional parameters to pass to the destination route.
 */
export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    }
}

/**
 * Navigates back to the previous screen in the stack.
 * Checks if back navigation is possible before attempting.
 */
export function goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
    }
}

/**
 * Specialized navigator for the Order Tracking screen.
 * 
 * @param {string} orderId - The ID of the order to track.
 */
export function navigateToOrder(orderId) {
    if (navigationRef.isReady()) {
        navigationRef.navigate('TrackOrder', { orderId });
    }
}

/**
 * Specialized navigator for the Notifications screen.
 */
export function navigateToNotifications() {
    if (navigationRef.isReady()) {
        navigationRef.navigate('Notifications');
    }
}

