import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CategoriesScreen, OrdersScreen, CartScreen, ProfileScreen } from '../screens';
import { CategoriesIcon, OrdersIcon, CartIcon, ProfileIcon } from '../components/TabBarIcons';
import { colors } from '../theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, KeyboardAvoidingView } from 'react-native';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = ({ onLogout }) => {
    const insets = useSafeAreaInsets();
    // Floating, rounded, shadowed tab bar with safe area and Poppins font
    const tabBarStyle = {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 64 + (Platform.OS === 'ios' ? insets.bottom : 8),
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        paddingTop: 8,
        paddingHorizontal: 16,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: colors.background,
        borderTopWidth: 0,
        marginHorizontal: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
            },
            android: {
                elevation: 16,
            },
        }),
    };
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <Tab.Navigator
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: colors.primary, // #DC3173
                        tabBarInactiveTintColor: '#999999',
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
                    sceneContainerStyle={{ backgroundColor: colors.background }}
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
