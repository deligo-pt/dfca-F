import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

/**
 * PaymentRefundsScreen
 * 
 * Support screen for payment and refund related queries.
 * Provides a list of common topics that direct users to chat support.
 */
const PaymentRefundsScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();

    const handleTopicPress = (topic) => {
        // Navigate to Chat with specific initial message based on topic
        // Navigate to Chat with specific initial message based on topic
        navigation.navigate('LiveChat', {
            issueType: `Payment Question: ${topic.title}`
        });
    };

    const topics = [
        { title: t('refundStatus'), icon: 'time-outline' },
        { title: t('unrecognizedCharge'), icon: 'alert-circle-outline' },
        { title: t('paymentMethods'), icon: 'card-outline' },
        { title: t('requestInvoice'), icon: 'document-text-outline' },
    ];

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        backButton: {
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 18,
            fontFamily: 'Poppins-SemiBold',
            color: colors.text.primary,
        },
        content: {
            padding: 16,
        },
        description: {
            fontSize: 14,
            fontFamily: 'Poppins-Regular',
            color: colors.text.secondary,
            marginBottom: 24,
        },
        topicCard: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surface,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary + '15', // 10% opacity
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16
        },
        topicTitle: {
            flex: 1,
            fontSize: 16,
            fontFamily: 'Poppins-Medium',
            color: colors.text.primary,
        },
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('paymentRefunds')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.description}>
                    {t('paymentSupportDesc') || 'Get help with your payments and refunds. Select a topic below to chat with our support team.'}
                </Text>

                {topics.map((topic, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.topicCard}
                        onPress={() => handleTopicPress(topic)}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name={topic.icon} size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.topicTitle}>{topic.title}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentRefundsScreen;
