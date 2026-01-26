import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

/**
 * FAQsScreen
 * 
 * Displays a list of frequently asked questions with expandable answers.
 * Mock data is used for now.
 */
const FAQsScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const [expandedId, setExpandedId] = useState(null);

    // Memoize styles to prevent unnecessary recreation on re-renders while allowing dynamic theming
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Mock Data
    const faqs = [
        {
            id: 1,
            category: 'Ordering',
            questions: [
                {
                    id: 'q1',
                    question: 'How do I place an order?',
                    answer: 'To place an order, browse the restaurants, select your items, add them to your cart, and proceed to checkout. You can pay using your preferred payment method.'
                },
                {
                    id: 'q2',
                    question: 'Can I cancel my order?',
                    answer: 'You can cancel your order within the first 5 minutes of placing it. Go to "Orders", select your active order, and tap "Cancel Order". If the restaurant has already started preparing your food, cancellation might not be possible.'
                }
            ]
        },
        {
            id: 2,
            category: 'Payment',
            questions: [
                {
                    id: 'q3',
                    question: 'What payment methods do you accept?',
                    answer: 'We accept major credit/debit cards (Visa, Mastercard), digital wallets (Apple Pay, Google Pay), and cash on delivery in select areas.'
                },
                {
                    id: 'q4',
                    question: 'How do I apply a promo code?',
                    answer: 'In your cart, tap on "Promo Code" or "Apply Voucher", enter your code, and tap "Apply". The discount will be reflected in your total.'
                }
            ]
        },
        {
            id: 3,
            category: 'Delivery',
            questions: [
                {
                    id: 'q5',
                    question: 'How can I track my order?',
                    answer: 'Once your order is confirmed, you can track it in real-time by going to the "Orders" tab and selecting "Track Order".'
                },
                {
                    id: 'q6',
                    question: 'What if I am not home when the rider arrives?',
                    answer: 'The rider will try to contact you. If they cannot reach you, they will wait for 10 minutes before leaving. Please ensure you are available to receive your order.'
                }
            ]
        }
    ];

    const toggleExpand = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar
                barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
                backgroundColor="transparent"
                translucent={true}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerText}>{t('faqs')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {faqs.map((category) => (
                    <View key={category.id}>
                        <Text style={styles.categoryTitle}>{category.category}</Text>
                        {category.questions.map((q) => (
                            <TouchableOpacity
                                key={q.id}
                                style={styles.questionCard}
                                onPress={() => toggleExpand(q.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.questionHeader}>
                                    <Text style={styles.questionText}>{q.question}</Text>
                                    <Ionicons
                                        name={expandedId === q.id ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={colors.text.light}
                                    />
                                </View>
                                {expandedId === q.id && (
                                    <View style={styles.answerContainer}>
                                        <Text style={styles.answerText}>{q.answer}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Poppins-SemiBold',
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    content: {
        padding: 16,
        paddingBottom: 24,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Poppins-Bold',
        marginBottom: 12,
        marginTop: 8,
    },
    questionCard: {
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    questionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.primary,
        fontFamily: 'Poppins-Medium',
        marginRight: 8,
    },
    answerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
    },
    answerText: {
        fontSize: 14,
        color: colors.text.secondary,
        fontFamily: 'Poppins-Regular',
        lineHeight: 22,
    },
});

export default FAQsScreen;
