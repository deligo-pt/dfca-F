import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

/**
 * AccountProfileHelpScreen
 * 
 * Provides FAQs and support for Account & Profile related issues.
 * Directs users to Settings for profile management.
 */
const AccountProfileHelpScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { colors, isDarkMode } = useTheme();

    const styles = createStyles(colors);

    // Hardcoded FAQs for Account & Profile
    // In a real app, these might come from a backend or translation files
    const faqs = [
        {
            id: 1,
            question: t('resetPasswordQuestion') || "How do I reset my password?",
            answer: t('resetPasswordAnswer') || "You can reset your password by going to the Login screen and clicking 'Forgot Password'. Follow the instructions sent to your email."
        },
        {
            id: 2,
            question: t('changeEmailQuestion') || "Can I change my email address?",
            answer: t('changeEmailAnswer') || "Currently, for security reasons, you cannot change your registered email address directly in the app. Please contact support if you need to update it."
        },
        {
            id: 3,
            question: t('deleteAccountQuestion') || "How do I delete my account?",
            answer: t('deleteAccountAnswer') || "We're sorry to see you go. You can delete your account from the Settings menu. Go to Settings > Delete Account. Please note this action is irreversible."
        },
        {
            id: 4,
            question: t('updateProfileQuestion') || "How do I update my profile?",
            answer: t('updateProfileAnswer') || "You can update your name and phone number in the 'Edit Profile' section. Go to Account > Edit Profile."
        }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent={true}
                animated={true}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('accountProfileHelp') || 'Account & Profile'}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>{t('commonAccountQuestions') || 'Common questions about your account'}</Text>

                {/* FAQ List */}
                <View style={styles.faqList}>
                    {faqs.map(faq => (
                        <FAQItem key={faq.id} question={faq.question} answer={faq.answer} colors={colors} styles={styles} />
                    ))}
                </View>

                {/* Action Card: Go to Settings */}
                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>{t('manageAccount') || 'Manage Account'}</Text>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="settings-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>{t('goToSettings') || 'Go to Settings'}</Text>
                            <Text style={styles.actionDescription}>{t('manageSecurityPreferences') || 'Manage security, notifications, and more'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '15' }]}>
                            <Ionicons name="person-outline" size={24} color={colors.secondary || '#4CAF50'} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>{t('editProfile') || 'Edit Profile'}</Text>
                            <Text style={styles.actionDescription}>{t('updateNamePhone') || 'Update your name and phone number'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
                    </TouchableOpacity>
                </View>

                {/* Contact Support */}
                <View style={styles.supportSection}>
                    <Text style={styles.supportText}>{t('stillNeedHelp') || 'Still need help?'}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('LiveChat')}>
                        <Text style={styles.contactLink}>{t('contactSupport') || 'Contact Support'}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const FAQItem = ({ question, answer, colors, styles }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.questionCardContainer}>
            <TouchableOpacity
                style={styles.questionHeader}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.questionText}>{question}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text.light} />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{answer}</Text>
                </View>
            )}
        </View>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Poppins-SemiBold',
    },
    placeholder: {
        width: 40,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    subtitle: {
        fontSize: 14,
        color: colors.text.secondary,
        fontFamily: 'Poppins-Regular',
        marginBottom: 16,
    },
    faqList: {
        marginBottom: 32,
    },
    questionCardContainer: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    questionText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
        color: colors.text.primary,
        marginRight: 8,
    },
    answerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
    },
    answerText: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        lineHeight: 22,
    },
    actionSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15', // 15 = roughly 8-10% opacity hex
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 12,
        color: colors.text.secondary,
        fontFamily: 'Poppins-Regular',
    },
    supportSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    supportText: {
        fontSize: 14,
        color: colors.text.secondary,
        fontFamily: 'Poppins-Regular',
        marginBottom: 8,
    },
    contactLink: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        fontFamily: 'Poppins-SemiBold',
    },
});

export default AccountProfileHelpScreen;
