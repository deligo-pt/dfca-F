import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { customerApi } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';

const { width, height } = Dimensions.get('window');

const RatingStar = ({ filled, onPress, size = 32 }) => {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        onPress();
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons
                    name={filled ? 'star' : 'star-outline'}
                    size={size}
                    color={filled ? '#FFD700' : colors.text.light} // Gold for filled
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

const SubRatingRow = ({ label, rating, onRate }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.subRatingRow}>
            <Text style={[styles.subRatingLabel, { color: colors.text.primary }]}>{label}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => onRate(star)} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                        <Ionicons
                            name={star <= rating ? 'star' : 'star'}
                            size={24}
                            color={star <= rating ? '#FFD700' : colors.border} // Use border color for empty state
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const TagButton = ({ label, selected, onPress }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[
                styles.tagButton,
                {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary + '15' : 'transparent', // 15 = 10% opacity hex
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.tagText,
                    { color: selected ? colors.primary : colors.text.secondary },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const OrderRatingModal = ({ visible, onClose, orderId, restaurantName, driverName, onRatingSuccess }) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // Stages: 'PRODUCT' -> 'DRIVER'
    const [stage, setStage] = useState('PRODUCT');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // { type: 'success' | 'error' | 'alreadyRated', message: string, title: string }

    // Product Rating State
    const [productRating, setProductRating] = useState(0);
    const [foodQuality, setFoodQuality] = useState(0);
    const [packaging, setPackaging] = useState(0);

    // Driver Rating State
    const [driverRating, setDriverRating] = useState(0);
    const [deliverySpeed, setDeliverySpeed] = useState(0);
    const [riderBehavior, setRiderBehavior] = useState(0);

    // Animation values
    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => {
                // Reset state on close
                setStage('PRODUCT');
                setProductRating(0);
                setFoodQuality(0);
                setPackaging(0);
                setDriverRating(0);
                setDeliverySpeed(0);
                setRiderBehavior(0);
                setResult(null);
            });
        }
    }, [visible]);

    const handleClose = () => {
        if (submitting) return;
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const getSentiment = (rating) => {
        if (rating >= 4) return 'POSITIVE';
        if (rating === 3) return 'NEUTRAL';
        return 'NEGATIVE';
    }

    const submitSingleRating = async (payload) => {
        try {
            await customerApi.post(API_ENDPOINTS.RATINGS.CREATE, payload);
            return 'SUCCESS';
        } catch (error) {
            const isDuplicate = error.response?.status === 400 &&
                (
                    (error.response?.data?.message && error.response.data.message.includes('already submitted')) ||
                    (error.response?.data?.error?.message && error.response.data.error.message.includes('already submitted'))
                );
            if (isDuplicate) return 'ALREADY_RATED';
            throw error;
        }
    };



    const submitProductRating = async () => {
        if (productRating === 0) {
            Alert.alert(t('ratingRequired') || 'Rating Required', t('pleaseRateFood') || 'Please rate the food before continuing.');
            return;
        }

        // If driver name exists, go to next step
        if (driverName) {
            setStage('DRIVER');
        } else {
            // If no driver (e.g. pickup), submit immediately
            await submitAllRatings(false);
        }
    };

    const submitAllRatings = async (includeDriver = true) => {
        setSubmitting(true);
        try {
            let productStatus = 'SKIPPED';
            let driverStatus = 'SKIPPED';

            // 1. Submit Product Rating
            const productPayload = {
                ratingType: "PRODUCT",
                rating: productRating,
                orderId: orderId,
                subRatings: {
                    foodQuality: foodQuality || productRating,
                    packaging: packaging || productRating
                }
            };

            // Attempt product rating
            productStatus = await submitSingleRating(productPayload);

            // 2. Submit Delivery Partner Rating (if applicable)
            if (includeDriver && driverName) {
                if (driverRating > 0) {
                    const driverPayload = {
                        ratingType: "DELIVERY_PARTNER",
                        rating: driverRating,
                        orderId: orderId,
                        subRatings: {
                            deliverySpeed: deliverySpeed || driverRating,
                            riderBehavior: riderBehavior || driverRating
                        }
                    };
                    driverStatus = await submitSingleRating(driverPayload);
                }
            }

            console.log('Rating Statuses:', { productStatus, driverStatus });

            // Determine final result state
            if (productStatus === 'ALREADY_RATED' && (driverStatus === 'ALREADY_RATED' || driverStatus === 'SKIPPED')) {
                // If everything attempted was already rated
                setResult({
                    type: 'alreadyRated',
                    title: t('thankYou'),
                    message: t('alreadyRated') || 'You have already rated this order.'
                });
            } else if (productStatus === 'SUCCESS' || driverStatus === 'SUCCESS') {
                // If at least one thing succeeded
                setResult({
                    type: 'success',
                    title: t('thankYou') || 'Thank You!',
                    message: t('ratingsSubmitted') || 'Your feedback helps us improve.'
                });
            } else {
                // Fallback
                setResult({
                    type: 'success',
                    title: t('thankYou') || 'Thank You!',
                    message: t('ratingsSubmitted') || 'Your feedback helps us improve.'
                });
            }

        } catch (error) {
            console.error('Rating submission failed:', error);
            setResult({
                type: 'error',
                title: t('error'),
                message: t('failedToSubmitRating') || 'Failed to submit rating. Please try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderUnifiedContent = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
            {/* PRODUCT SECTION */}
            <View style={{ marginBottom: spacing.xl }}>
                <Text style={styles.title}>{t('howWasFood') || `How was the food from ${restaurantName}?`}</Text>
                <Text style={styles.subtitle}>{t('yourFeedbackHelps') || 'Your feedback helps others make better choices.'}</Text>

                <View style={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <RatingStar
                            key={star}
                            filled={star <= productRating}
                            onPress={() => {
                                setProductRating(star);
                            }}
                            size={40}
                        />
                    ))}
                </View>

                {productRating > 0 && (
                    <View style={styles.subRatingsContainer}>
                        <SubRatingRow
                            label={t('foodQuality') || "Food Quality"}
                            rating={foodQuality}
                            onRate={setFoodQuality}
                        />
                        <SubRatingRow
                            label={t('packaging') || "Packaging"}
                            rating={packaging}
                            onRate={setPackaging}
                        />
                    </View>
                )}


            </View>

            {/* DRIVER SECTION */}
            {driverName && (
                <View style={{ marginBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xl }}>
                    <Text style={styles.title}>{t('howWasDelivery') || `How was the delivery by ${driverName}?`}</Text>
                    <Text style={styles.subtitle}>{t('rateDriverSubtitle') || 'Rate the delivery service.'}</Text>

                    <View style={styles.starContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <RatingStar
                                key={star}
                                filled={star <= driverRating}
                                onPress={() => {
                                    setDriverRating(star);
                                }}
                                size={40}
                            />
                        ))}
                    </View>

                    {driverRating > 0 && (
                        <View style={styles.subRatingsContainer}>
                            <SubRatingRow
                                label={t('deliverySpeed') || "Delivery Speed"}
                                rating={deliverySpeed}
                                onRate={setDeliverySpeed}
                            />
                            <SubRatingRow
                                label={t('riderBehavior') || "Rider Behavior"}
                                rating={riderBehavior}
                                onRate={setRiderBehavior}
                            />
                        </View>
                    )}


                </View>
            )}

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary, opacity: productRating > 0 ? 1 : 0.6 }]}
                onPress={() => submitAllRatings(!!driverName)}
                disabled={productRating === 0 || submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.nextButtonText}>{t('submitReviews') || 'Submit Reviews'}</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
    );

    const renderResult = () => (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, justifyContent: 'center', flex: 1 }}>
            <Ionicons
                name={result?.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={80}
                color={result?.type === 'error' ? colors.error : colors.success}
                style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.title}>{result?.title}</Text>
            <Text style={[styles.subtitle, { paddingHorizontal: spacing.lg, textAlign: 'center' }]}>{result?.message}</Text>

            <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary, width: '100%', marginTop: spacing.lg }]}
                onPress={() => {
                    if (result?.type === 'success' || result?.type === 'alreadyRated') {
                        if (onRatingSuccess) onRatingSuccess();
                    }
                    handleClose();
                }}
            >
                <Text style={styles.nextButtonText}>{t('ok') || 'OK'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: colors.surface,
                            transform: [{ translateY: slideAnim }],
                            maxHeight: height * 0.9 // Limit height to 90% of screen
                        }
                    ]}
                >
                    <View style={styles.handleBar} />

                    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
                        {result ? renderResult() : renderUnifiedContent()}
                    </View>

                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
        minHeight: height * 0.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: spacing.md,
    },
    stepContent: {
        paddingTop: spacing.sm,
    },
    title: {
        fontSize: fontSize.xl,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: spacing.xs,
        color: '#333', // Will be overridden by theme in component
    },
    subtitle: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: spacing.xl,
        color: '#888',
    },
    starContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    reviewContainer: {
        marginBottom: spacing.xl,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        height: 100,
        textAlignVertical: 'top',
        fontFamily: 'Poppins-Regular',
        fontSize: fontSize.md,
    },
    nextButton: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    nextButtonText: {
        color: '#FFF',
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-SemiBold',
    },
    skipButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Medium',
    },
    tagButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    tagText: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
    },
    subRatingsContainer: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.sm,
        backgroundColor: '#FAFAFA', // Very light gray background for the block
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    subRatingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    subRatingLabel: {
        fontSize: fontSize.md, // Increased font size
        fontFamily: 'Poppins-Medium', // More weight
        flex: 1,
    }
});

export default OrderRatingModal;
