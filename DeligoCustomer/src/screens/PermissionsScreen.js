import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import firebaseNotificationService from '../services/firebaseNotificationService';

const PermissionsScreen = (props) => {
    const { navigation } = props;
    const { colors } = useTheme();
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1: Location, 2: Notifications, 3: Done
    const [loading, setLoading] = useState(false);

    // Permission states
    const [locationStatus, setLocationStatus] = useState('undetermined');
    const [notificationStatus, setNotificationStatus] = useState('undetermined');
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        checkCurrentPermissions();

        // Add AppState listener to re-check permissions when app comes to foreground
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('App returned to foreground, checking permissions...');
                checkCurrentPermissions();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkCurrentPermissions = async () => {
        try {
            // Check Location
            const { status: locStatus } = await Location.getForegroundPermissionsAsync();
            setLocationStatus(locStatus);

            // Check Notifications
            const authStatus = await messaging().hasPermission();
            console.log('Current notification permission status:', authStatus);

            const notifEnabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            // If newly granted, ensure we register the token
            if (notifEnabled && notificationStatus !== 'granted') {
                // Only register if we're moving from non-granted to granted state
                if (notificationStatus !== 'undetermined') {
                    console.log('Permission changed to granted in background, registering token...');
                    await firebaseNotificationService.reinitializeAfterPermission();
                }
            }

            setNotificationStatus(notifEnabled ? 'granted' : 'undetermined');
        } catch (error) {
            console.warn('Error checking permissions:', error);
        }
    };

    const handleLocationPermission = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationStatus(status);
            if (status === 'granted') {
                setCurrentStep(2); // Move to Notifications
            } else {
                Alert.alert(
                    'Location Required',
                    'We need your location to show nearby restaurants and deliver food to you. Please enable it in settings.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setCurrentStep(2) }, // Allow skip
                        { text: 'Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.warn('Error requesting location permission:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationPermission = async () => {
        setLoading(true);
        try {
            console.log('Requesting notification permission...');
            const authStatus = await messaging().requestPermission();
            console.log('Permission request result:', authStatus);

            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            setNotificationStatus(enabled ? 'granted' : 'denied');

            if (enabled) {
                // Immediately register FCM token with backend after permission is granted
                console.log('Notification permission granted, registering FCM token...');
                await firebaseNotificationService.reinitializeAfterPermission();
                completePermissions();
            } else {
                // If denied, it might be permanently denied or user just said no.
                // We should guide them to settings if they want to enable it.
                Alert.alert(
                    'Permission Required',
                    'Notification permission was denied. Please enable it in system settings to receive order updates.',
                    [
                        { text: 'Later', style: 'cancel', onPress: () => completePermissions() },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
            }
        } catch (error) {
            console.warn('Error requesting notification permission:', error);
            completePermissions(); // Proceed anyway
        } finally {
            setLoading(false);
        }
    };

    const completePermissions = async () => {
        try {
            await AsyncStorage.setItem('HAS_VIEWED_PERMISSIONS', 'true');
            if (props.onComplete) {
                props.onComplete();
            }
        } catch (e) {
            console.warn(e);
        }
    };

    const styles = getStyles(colors);

    const renderStepContent = () => {
        if (currentStep === 0) {
            return (
                <>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={80} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>Let's get you set up</Text>
                    <Text style={styles.description}>
                        To provide the best food delivery experience, Deligo needs access to your location and notifications.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={() => setCurrentStep(1)}>
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </>
            );
        }

        if (currentStep === 1) {
            return (
                <>
                    <View style={styles.iconContainer}>
                        <Ionicons name="location" size={80} color="#FF9800" />
                    </View>
                    <Text style={styles.title}>Enable Location</Text>
                    <Text style={styles.description}>
                        We need your location to find restaurants near you and ensure precise delivery.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={handleLocationPermission} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Requesting...' : 'Allow Location'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={() => setCurrentStep(2)}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                </>
            );
        }

        if (currentStep === 2) {
            return (
                <>
                    <View style={styles.iconContainer}>
                        <Ionicons name="notifications" size={80} color="#2196F3" />
                    </View>
                    <Text style={styles.title}>Enable Notifications</Text>
                    <Text style={styles.description}>
                        Get real-time updates on your order status, delivery driver location, and exclusive promos.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={handleNotificationPermission} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Requesting...' : 'Allow Notifications'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={completePermissions}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                </>
            );
        }

        return null;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {renderStepContent()}
            </View>
            <View style={styles.footer}>
                <View style={styles.dots}>
                    <View style={[styles.dot, currentStep === 0 && styles.activeDot]} />
                    <View style={[styles.dot, currentStep === 1 && styles.activeDot]} />
                    <View style={[styles.dot, currentStep === 2 && styles.activeDot]} />
                </View>
            </View>
        </SafeAreaView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    title: {
        fontSize: fontSize.xxl,
        fontFamily: 'Poppins-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xxl,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    buttonText: {
        color: '#fff',
        fontSize: fontSize.md,
        fontFamily: 'Poppins-SemiBold',
    },
    skipButton: {
        padding: spacing.sm,
    },
    skipText: {
        color: colors.text.light,
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
    },
    footer: {
        paddingBottom: spacing.xl,
        alignItems: 'center'
    },
    dots: {
        flexDirection: 'row',
        gap: 8
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border
    },
    activeDot: {
        width: 24,
        backgroundColor: colors.primary
    }
});

export default PermissionsScreen;
