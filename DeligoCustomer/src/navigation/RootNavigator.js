
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBarStyle } from 'expo-status-bar';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from '../contexts/LocationContext';
import {
    OnboardingScreen,
    LoginScreen,
    TermsOfServiceScreen,
    PrivacyPolicyScreen,
    LocationAddressScreen,
    RestaurantDetailsScreen,
    TrackOrderScreen,
    CheckoutScreen,
    EditProfileScreen,
    VouchersScreen,
    SavedAddressesScreen,
    PaymentMethodsScreen,
    ReferralsScreen,
    NotificationsScreen,
    SettingsScreen,
    HelpCenterScreen,
    CartDetailScreen,
    SeeAllScreen,
    SearchScreen
} from '../screens';
import { BottomTabNavigator } from './index'; // assuming index.js exports BottomTabNavigator or directly from './BottomTabNavigator'

const Stack = createStackNavigator();

export default function RootNavigator() {
    const { isAuthenticated, isOnboardingCompleted, isLoading } = useProfile();

    // Note: we might want to show a splash/loading screen here if isLoading is true, 
    // but App.js handles the native splash screen. 
    // If we need a js-rendering loading state, we can return null or a specific component.
    if (isLoading) {
        return null;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isOnboardingCompleted ? (
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : !isAuthenticated ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                <Stack.Screen name="Main" component={BottomTabNavigator} />
            )}

            {/* Common Screens accessible from various places */}
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="LocationAddress" component={LocationAddressScreen} />
            <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
            <Stack.Screen name="CartDetail" component={CartDetailScreen} />
            <Stack.Screen name="SeeAll" component={SeeAllScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />

            {/* Account Related Screens */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Vouchers" component={VouchersScreen} />
            <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="Referrals" component={ReferralsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        </Stack.Navigator>
    );
}
