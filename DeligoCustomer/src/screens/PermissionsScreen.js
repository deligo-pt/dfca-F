/**
 * PermissionsScreen
 * Step-by-step wizard to request permissions on first app launch
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import firebaseNotificationService from '../services/firebaseNotificationService';

const PERMISSIONS_VIEWED_KEY = 'HAS_VIEWED_PERMISSIONS';

const PermissionsScreen = (props) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1: Location, 2: Notifications
    const [loading, setLoading] = useState(false);

    // Permission states
    const [locationStatus, setLocationStatus] = useState('undetermined');
    const [notificationStatus, setNotificationStatus] = useState('undetermined');

    useEffect(() => {
        checkCurrentPermissions();
    }, []);

    const checkCurrentPermissions = async () => {
        try {
            // Check Location
            const { status: locStatus } = await Location.getForegroundPermissionsAsync();
            setLocationStatus(locStatus);

            // Check Notifications
            const notifStatus = await firebaseNotificationService.checkPermission();
            setNotificationStatus(notifStatus);
        } catch (error) {
            console.warn('[PermissionsScreen] Error checking permissions:', error);
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
                    t('permissions.locationRequired'),
                    t('permissions.locationDescription'),
                    [
                        { text: t('cancel'), style: 'cancel', onPress: () => setCurrentStep(2) },
                        { text: t('settings'), onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.warn('[PermissionsScreen] Error requesting location permission:', error);
            setCurrentStep(2);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationPermission = async () => {
        setLoading(true);
        try {
            const enabled = await firebaseNotificationService.requestPermission();
            setNotificationStatus(enabled ? 'granted' : 'denied');

            if (enabled) {
                // Immediately register FCM token with backend after permission is granted
                console.log('[PermissionsScreen] Notification permission granted, registering FCM token...');
                await firebaseNotificationService.reinitializeAfterPermission();
                completePermissions();
            } else {
                Alert.alert(
                    t('permissions.notificationsOptional'),
                    t('permissions.notificationsSkipMessage'),
                    [
                        { text: t('skip'), style: 'cancel', onPress: () => completePermissions() },
                        { text: t('settings'), onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.warn('[PermissionsScreen] Error requesting notification permission:', error);
            completePermissions(); // Proceed anyway
        } finally {
            setLoading(false);
        }
    };

    const completePermissions = async () => {
        try {
            await AsyncStorage.setItem(PERMISSIONS_VIEWED_KEY, 'true');
            if (props.onComplete) {
                props.onComplete();
            }
        } catch (e) {
            console.warn('[PermissionsScreen] Error saving permissions viewed:', e);
            if (props.onComplete) {
                props.onComplete();
            }
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
                    <Text style={styles.title}>
                        {t('permissions.introTitle')}
                    </Text>
                    <Text style={styles.description}>
                        {t('permissions.introDescription')}
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={() => setCurrentStep(1)}>
                        <Text style={styles.buttonText}>{t('continue')}</Text>
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
                    <Text style={styles.title}>
                        {t('permissions.locationTitle')}
                    </Text>
                    <Text style={styles.description}>
                        {t('permissions.locationDescription')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLocationPermission}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? t('common.requesting') : t('permissions.allowLocation')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={() => setCurrentStep(2)}>
                        <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
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
                    <Text style={styles.title}>
                        {t('permissions.notificationsTitle')}
                    </Text>
                    <Text style={styles.description}>
                        {t('permissions.notificationsDescription')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleNotificationPermission}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? t('common.requesting') : t('permissions.allowNotifications')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={completePermissions}>
                        <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
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
    buttonDisabled: {
        opacity: 0.7,
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
export { PERMISSIONS_VIEWED_KEY };
