/**
 * @format
 * AlertModal - Professional alert modal component
 * Reusable modal for displaying alerts, warnings, and confirmations
 */

import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

const AlertModal = ({
    visible,
    title,
    message,
    icon = 'alert-circle',
    iconColor,
    onClose,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
                        <Ionicons
                            name={icon}
                            size={48}
                            color={iconColor || colors.primary}
                        />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text.primary }]}>
                        {title}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: colors.text.secondary }]}>
                        {message}
                    </Text>

                    {/* OK Button */}
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>{t('ok') || 'OK'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(width - 40, 340),
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
});

export default AlertModal;
