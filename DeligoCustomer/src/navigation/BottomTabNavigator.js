/**
 * BottomTabNavigator Component
 *
 * Main application navigation.
 * Manages tab routes (Categories, Orders, Cart, Profile).
 * Handles safe area insets and active/inactive styling.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CategoriesScreen, OrdersScreen, CartScreen, ProfileScreen } from '../screens';
import { CategoriesIcon, OrdersIcon, CartIcon, ProfileIcon } from '../components/TabBarIcons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, KeyboardAvoidingView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';

const Tab = createBottomTabNavigator();

/**
 * BottomTabNavigator
 * 
 * @param {Object} props
 * @param {Function} props.onLogout - Logout handler.
 */
const BottomTabNavigator = ({ onLogout }) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    // Context hooks for badges
    const { cartsArray } = useCart();
    const { ongoingOrders, ordersCount, fetchOrders } = useOrders();

    // Badge calculations
    const cartsCount = (cartsArray && cartsArray.length) ? cartsArray.length : 0;
    const ongoingCount = Array.isArray(ongoingOrders) ? ongoingOrders.length : 0;
    const ordersBadge = ongoingCount > 0 ? ongoingCount : (ordersCount > 0 ? ordersCount : undefined);

    // Calculate dynamic bottom padding to respect safe areas (notch/home bar)
    const bottomPadding = Platform.select({
        ios: insets.bottom > 0 ? insets.bottom : 12,
        android: Math.max(insets.bottom, 12),
    });

    const tabBarBaseHeight = 64;
    const totalTabBarHeight = tabBarBaseHeight + bottomPadding;

    // Custom tab bar styling to support floating effect and dark mode
    const tabBarStyle = {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: totalTabBarHeight,
        paddingBottom: bottomPadding,
        paddingTop: 8,
        paddingHorizontal: 16,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: isDarkMode ? colors.surface : colors.background,
        borderTopWidth: isDarkMode ? 1 : 0,
        borderTopColor: isDarkMode ? colors.border : 'transparent',
        marginHorizontal: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDarkMode ? 0.3 : 0.12,
                shadowRadius: isDarkMode ? 20 : 16,
            },
            android: {
                elevation: isDarkMode ? 20 : 16,
            },
        }),
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top', 'left', 'right']}>
            <StatusBar style="light" backgroundColor={colors.primary} />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    <Tab.Navigator
                        screenOptions={{
                            headerShown: false,
                            tabBarActiveTintColor: colors.primary,
                            tabBarInactiveTintColor: isDarkMode ? colors.text.light : '#999999',
                            tabBarStyle,
                            tabBarHideOnKeyboard: true,
                            tabBarLabelStyle: {
                                fontSize: 12,
                                fontFamily: 'Poppins-Medium',
                                letterSpacing: 0.2,
                                paddingTop: 2,
                            },
                            tabBarItemStyle: {
                                justifyContent: 'center',
                                alignItems: 'center',
                            },
                        }}
                        sceneContainerStyle={{
                            backgroundColor: colors.background,
                            paddingBottom: totalTabBarHeight,
                        }}
                    >
                        <Tab.Screen
                            name="Categories"
                            component={CategoriesScreen}
                            options={{
                                tabBarLabel: t('categories'),
                                tabBarIcon: ({ focused, color }) => <CategoriesIcon focused={focused} color={color} />,
                            }}
                        />
                        <Tab.Screen
                            name="Orders"
                            component={OrdersScreen}
                            options={{
                                tabBarLabel: t('orders'),
                                tabBarIcon: ({ focused, color }) => <OrdersIcon focused={focused} color={color} />,
                                tabBarBadge: ordersBadge,
                                tabBarBadgeStyle: { backgroundColor: colors.primary, color: '#fff', fontFamily: 'Poppins-SemiBold' },
                            }}
                            listeners={{
                                focus: () => {
                                    // Refresh orders when tab becomes active
                                    try { fetchOrders && fetchOrders(); } catch { }
                                }
                            }}
                        />
                        <Tab.Screen
                            name="Cart"
                            component={CartScreen}
                            options={{
                                tabBarLabel: t('cart'),
                                tabBarIcon: ({ focused, color }) => <CartIcon focused={focused} color={color} />,
                                tabBarBadge: cartsCount > 0 ? cartsCount : undefined,
                                tabBarBadgeStyle: { backgroundColor: colors.primary, color: '#fff', fontFamily: 'Poppins-SemiBold' },
                            }}
                        />
                        <Tab.Screen
                            name="Profile"
                            options={{
                                tabBarLabel: t('account'),
                                tabBarIcon: ({ focused, color }) => <ProfileIcon focused={focused} color={color} />,
                            }}
                        >
                            {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
                        </Tab.Screen>
                    </Tab.Navigator>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
};

export default BottomTabNavigator;
