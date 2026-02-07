import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

/**
 * MaxQuantityModal
 * 
 * A premium, industry-grade modal to inform users when they've reached
 * the maximum stock limit for a product.
 */
const MaxQuantityModal = ({
    visible,
    onClose,
    maxStock,
    currentCartQty,
    attemptedQty,
    itemName = 'Item',
    onViewCart, // Optional action
}) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // Simplified state - relying on Native Modal animation for stability
    const [showModal, setShowModal] = useState(visible);

    useEffect(() => {
        setShowModal(visible);
    }, [visible]);

    if (!showModal) return null;

    // Calculate remaining
    const remaining = Math.max(0, maxStock - currentCartQty);

    return (
        <Modal
            transparent
            visible={showModal}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.backdrop}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={onClose}
                        activeOpacity={1}
                    />
                </View>

                <View
                    style={[
                        styles.modalContainer,
                        { backgroundColor: colors.surface }
                    ]}
                >
                    {/* Header Icon with Glow */}
                    <View style={styles.iconWrapper}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="alert" size={32} color="#FF9800" />
                        </View>
                        {/* Optional glow effect behind */}
                        <View style={[styles.glow, { backgroundColor: '#FF9800', opacity: 0.2 }]} />
                    </View>

                    <Text style={[styles.title, { color: colors.text.primary }]}>
                        {t('maxQuantityReached') || 'Max Limit Reached'}
                    </Text>

                    <Text style={[styles.description, { color: colors.text.secondary }]}>
                        {t('weSorryBut') || "We're sorry, but"} <Text style={{ fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{itemName}</Text> {t('hasStockLimitOf') || 'has a limited stock of'} <Text style={{ fontFamily: 'Poppins-Bold', color: colors.primary }}>{maxStock}</Text> {t('units') || 'units'}.
                    </Text>

                    <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t('inYourCart') || 'In your cart'}</Text>
                            <Text style={[styles.infoValue, { color: colors.text.primary }]}>{currentCartQty}</Text>
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t('availableToAdd') || 'Available to add'}</Text>
                            <Text style={[styles.infoValue, { color: colors.primary }]}>{remaining}</Text>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary || colors.primary]} // Fallback if secondary undefined
                                style={styles.gradientButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.primaryButtonText}>{t('gotIt') || 'Got It'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContainer: {
        width: Math.min(width * 0.85, 360),
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconWrapper: {
        marginBottom: 24,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    glow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        zIndex: 1,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        paddingHorizontal: 8,
    },
    infoBox: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 28,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    separator: {
        height: 1,
        marginVertical: 10,
        opacity: 0.5,
    },
    infoLabel: {
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
    },
    infoValue: {
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    },
    buttonContainer: {
        width: '100%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButton: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'Poppins-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default MaxQuantityModal;
