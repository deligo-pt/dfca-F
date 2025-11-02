import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CategoriesScreen, OrdersScreen, CartScreen, ProfileScreen } from '../screens';
import { CategoriesIcon, OrdersIcon, CartIcon, ProfileIcon } from '../components/TabBarIcons';
import { useTheme } from '../utils/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, KeyboardAvoidingView, Dimensions } from 'react-native';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = ({ onLogout }) => {
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = Dimensions.get('window');

    // Calculate proper bottom padding for tab bar
    // For large screens (> 800px height), ensure we account for proper spacing
    const bottomPadding = Platform.select({
        ios: insets.bottom > 0 ? insets.bottom : 12,
        android: Math.max(insets.bottom, 12), // Use at least 12, or actual inset if larger
    });

    // Tab bar base height
    const tabBarBaseHeight = 64;
    const totalTabBarHeight = tabBarBaseHeight + bottomPadding;

    // Floating, rounded, shadowed tab bar with safe area and Poppins font
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
                shadowColor: isDarkMode ? '#000' : '#000',
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <Tab.Navigator
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: colors.primary, // #DC3173
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
                        paddingBottom: totalTabBarHeight, // Prevent content from being hidden behind tab bar
                    }}
                >
                    <Tab.Screen
                        name="Categories"
                        component={CategoriesScreen}
                        options={{
                            tabBarIcon: ({ focused, color }) => <CategoriesIcon focused={focused} color={color} />,
                        }}
                    />
                    <Tab.Screen
                        name="Orders"
                        component={OrdersScreen}
                        options={{
                            tabBarIcon: ({ focused, color }) => <OrdersIcon focused={focused} color={color} />,
                        }}
                    />
                    <Tab.Screen
                        name="Cart"
                        component={CartScreen}
                        options={{
                            tabBarIcon: ({ focused, color }) => <CartIcon focused={focused} color={color} />,
                        }}
                    />
                    <Tab.Screen
                        name="Profile"
                        options={{
                            tabBarLabel: 'Account',
                            tabBarIcon: ({ focused, color }) => <ProfileIcon focused={focused} color={color} />,
                        }}
                    >
                        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
                    </Tab.Screen>
                </Tab.Navigator>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default BottomTabNavigator;
