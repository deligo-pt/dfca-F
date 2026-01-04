import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Custom Toast Configuration for Deligo Customer App
 * Provides professional notification toasts like Pathao/Uber
 */

const DeligoToast = ({ text1, text2, onPress, hide }) => {
    return (
        <TouchableOpacity
            style={styles.toastContainer}
            onPress={() => {
                if (onPress) onPress();
                if (hide) hide();
            }}
            activeOpacity={0.9}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {text1}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                    {text2}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={hide}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="close" size={20} color="#999999" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const OrderToast = ({ text1, text2, onPress, hide }) => {
    return (
        <TouchableOpacity
            style={[styles.toastContainer, styles.orderToast]}
            onPress={() => {
                if (onPress) onPress();
                if (hide) hide();
            }}
            activeOpacity={0.9}
        >
            <View style={[styles.iconContainer, styles.orderIconContainer]}>
                <Ionicons name="bag-check" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {text1}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                    {text2}
                </Text>
            </View>
            <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap to view</Text>
                <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </View>
        </TouchableOpacity>
    );
};

const SuccessToast = ({ text1, text2, hide }) => {
    return (
        <View style={[styles.toastContainer, styles.successToast]}>
            <View style={[styles.iconContainer, styles.successIconContainer]}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {text1}
                </Text>
                {text2 && (
                    <Text style={styles.message} numberOfLines={2}>
                        {text2}
                    </Text>
                )}
            </View>
        </View>
    );
};

const ErrorToast = ({ text1, text2, hide }) => {
    return (
        <View style={[styles.toastContainer, styles.errorToast]}>
            <View style={[styles.iconContainer, styles.errorIconContainer]}>
                <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {text1}
                </Text>
                {text2 && (
                    <Text style={styles.message} numberOfLines={2}>
                        {text2}
                    </Text>
                )}
            </View>
        </View>
    );
};

export const toastConfig = {
    deligoToast: (props) => <DeligoToast {...props} />,
    orderToast: (props) => <OrderToast {...props} />,
    success: (props) => <SuccessToast {...props} />,
    error: (props) => <ErrorToast {...props} />,
};

const styles = StyleSheet.create({
    toastContainer: {
        width: '92%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        marginTop: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#DC3173',
    },
    orderToast: {
        borderLeftColor: '#4CAF50',
    },
    successToast: {
        borderLeftColor: '#4CAF50',
    },
    errorToast: {
        borderLeftColor: '#F44336',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DC3173',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    orderIconContainer: {
        backgroundColor: '#4CAF50',
    },
    successIconContainer: {
        backgroundColor: '#4CAF50',
    },
    errorIconContainer: {
        backgroundColor: '#F44336',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: '#666666',
        lineHeight: 18,
    },
    closeButton: {
        padding: 4,
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tapHintText: {
        fontSize: 12,
        fontFamily: 'Poppins-Medium',
        color: '#4CAF50',
    },
});

export default toastConfig;
