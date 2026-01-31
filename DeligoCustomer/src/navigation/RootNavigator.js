import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBarStyle } from 'expo-status-bar';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from '../contexts/LocationContext';
import NotificationOverlay from '../components/NotificationOverlay';
import {
    OnboardingScreen,
    LoginScreen,
    TermsOfServiceScreen,
    PrivacyPolicyScreen,
    LocationAddressScreen,
    RestaurantDetailsScreen,
    AddonsScreen,
    TrackOrderScreen,
    CheckoutScreen,
    EditProfileScreen,
    VouchersScreen,
    FavoriteOrdersScreen,
    SavedAddressesScreen,
    PaymentMethodsScreen,
    ReferralsScreen,
    NotificationsScreen,
    SettingsScreen,
    HelpCenterScreen,
    FAQsScreen,
    ChatScreen,
    CartDetailScreen,
    SeeAllScreen,
    SearchScreen,
    PermissionsScreen,
    OrderIssuesScreen,
    PaymentRefundsScreen
} from '../screens';
import { BottomTabNavigator } from './index'; // assuming index.js exports BottomTabNavigator or directly from './BottomTabNavigator'

const Stack = createStackNavigator();

/**
 * RootNavigator
 * 
 * Primary navigation controller acting as the app's entry point.
 * Manages high-level state-based routing:
 * - Permissions (First launch)
 * - Onboarding (New users)
 * - Authentication (Login/Register)
 * - Main App (Authenticated flow)
 * 
 * Also handles global modal screens and overlays.
 */
export default function RootNavigator() {
    const { isAuthenticated, isOnboardingCompleted, isLoading } = useProfile();

    // Permissions state tracking
    // Returns null initially to prevent premature rendering before check completes
    const [hasViewedPermissions, setHasViewedPermissions] = useState(null);

    useEffect(() => {
        checkPermissionsViewed();
    }, []);

    /**
     * Checks if the user has already viewed the permissions screen.
     * Persists the state in AsyncStorage to show it only once.
     */
    const checkPermissionsViewed = async () => {
        try {
            const viewed = await AsyncStorage.getItem('HAS_VIEWED_PERMISSIONS');
            setHasViewedPermissions(viewed === 'true');
        } catch (e) {
            console.warn('[RootNavigator] Permissions check failed:', e);
            setHasViewedPermissions(false);
        }
    };

    // Prevent rendering until critical state checks are complete
    if (isLoading || hasViewedPermissions === null) {
        return null; // Native splash screen remains visible
    }

    return (
        <>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {/* Authorization Flow */}
                {!hasViewedPermissions ? (
                    <Stack.Screen name="Permissions">
                        {(props) => <PermissionsScreen {...props} onComplete={() => setHasViewedPermissions(true)} />}
                    </Stack.Screen>
                ) : !isOnboardingCompleted ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : !isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <Stack.Screen name="Main" component={BottomTabNavigator} />
                )}

                {/* Shared/Modal Screens */}
                <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="LocationAddress" component={LocationAddressScreen} />
                <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
                <Stack.Screen name="Addons" component={AddonsScreen} />
                <Stack.Screen name="CartDetail" component={CartDetailScreen} />
                <Stack.Screen name="SeeAll" component={SeeAllScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} />

                {/* Profile & Settings Group */}
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="Vouchers" component={VouchersScreen} />
                <Stack.Screen name="FavoriteOrders" component={FavoriteOrdersScreen} />
                <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
                <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
                <Stack.Screen name="Referrals" component={ReferralsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
                <Stack.Screen name="FAQs" component={FAQsScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="OrderIssues" component={OrderIssuesScreen} />
                <Stack.Screen name="PaymentRefunds" component={PaymentRefundsScreen} />
            </Stack.Navigator>

            {/* Global Overlays */}
            {isAuthenticated && <NotificationOverlay />}
        </>
    );
}
