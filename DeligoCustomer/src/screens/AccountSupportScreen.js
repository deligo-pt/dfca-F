import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';

const AccountSupportScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { user: profile, isLoading } = useProfile();
    const insets = useSafeAreaInsets();

    const [expandedFaqId, setExpandedFaqId] = useState(null);

    const getFullName = () => {
        if (!profile) return 'Guest';
        if (profile.name && typeof profile.name === 'object') {
            return `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim();
        }
        return profile.name || profile.firstName || 'Customer';
    };

    // Customer-specific issue types
    const issueTypes = [
        { id: 'orderIssue', icon: 'receipt-outline', label: t('orderIssue') || 'Order Issue' },
        { id: 'paymentIssue', icon: 'card-outline', label: t('paymentIssue') || 'Payment Issue' },
        { id: 'accountIssue', icon: 'person-outline', label: t('accountIssue') || 'Account Settings' },
        { id: 'appFeedback', icon: 'chatbubble-ellipses-outline', label: t('appFeedback') || 'App Feedback' },
    ];

    const handleIssuePress = (issueType) => {
        // Here we map the ID to a user-friendly strings for the chat intro
        let issueLabel = issueType;
        if (issueType === 'orderIssue') issueLabel = 'Order Issue';
        else if (issueType === 'paymentIssue') issueLabel = 'Payment Issue';
        else if (issueType === 'accountIssue') issueLabel = 'Account Settings';
        else if (issueType === 'appFeedback') issueLabel = 'App Feedback';

        navigation.navigate('LiveChat', {
            issueType: issueLabel
        });
    };

    // Mock FAQs (Customer facing)
    const faqs = [
        { id: 1, question: "How do I track my order?", answer: "Go to your orders list and tap 'Track Order' on any active order to see real-time status." },
        { id: 2, question: "Can I cancel my order?", answer: "Yes, you can cancel your order within 5 minutes of placing it, as long as the restaurant hasn't started preparing it." },
        { id: 3, question: "How do I change my delivery address?", answer: "You can manage your saved addresses in Profile > Saved Addresses." },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            <View style={{ height: insets.top, backgroundColor: colors.card }} />

            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.text.primary }]}>{t('supportCenter') || 'Support Center'}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Reassurance Banner */}
            <View style={[styles.reassuranceContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.reassuranceText, { color: colors.text.secondary }]}>
                    {t('supportSubtitle') || 'We are here to help you with any issues you may have.'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('yourAccount') || 'Your Account'}</Text>
                    <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <>
                                <View style={styles.profileHeader}>
                                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.avatarText}>
                                            {getFullName().charAt(0)?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.profileInfo}>
                                        <Text style={[styles.profileName, { color: colors.text.primary }]}>
                                            {getFullName()}
                                        </Text>
                                        <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>
                                            {profile?.email}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.editButton, { borderColor: colors.primary }]}
                                    onPress={() => navigation.navigate('EditProfile')}
                                >
                                    <Text style={[styles.editButtonText, { color: colors.primary }]}>
                                        {t('editProfile') || 'Edit Profile'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Issue Types */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('whatCanWeHelpWith') || 'What can we help you with?'}</Text>
                    {issueTypes.map((issue) => (
                        <TouchableOpacity
                            key={issue.id}
                            style={[styles.issueCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => handleIssuePress(issue.id)}
                        >
                            <View style={[styles.issueIconContainer, { backgroundColor: (colors.primary) + '15' }]}>
                                <Ionicons name={issue.icon} size={22} color={colors.primary} />
                            </View>
                            <Text style={[styles.issueText, { color: colors.text.primary }]}>{issue.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQs */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('popularQuestions') || 'Popular Questions'}</Text>
                    {faqs.map((faq) => (
                        <View key={faq.id} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={styles.faqHeader}
                                onPress={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                            >
                                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                                <Text style={[styles.faqQuestion, { color: colors.text.primary }]}>{faq.question}</Text>
                                <Ionicons
                                    name={expandedFaqId === faq.id ? "chevron-up" : "chevron-down"}
                                    size={18}
                                    color={colors.text.secondary}
                                />
                            </TouchableOpacity>
                            {expandedFaqId === faq.id && (
                                <View style={styles.faqBody}>
                                    <Text style={[styles.faqAnswer, { color: colors.text.secondary }]}>{faq.answer}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerText: {
        fontSize: 18,
        fontFamily: 'Poppins-SemiBold',
        textAlign: 'center',
        flex: 1,
    },
    placeholder: {
        width: 40,
    },
    reassuranceContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 8,
    },
    reassuranceText: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        lineHeight: 20,
    },
    content: {
        paddingBottom: 40,
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    profileCard: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 20,
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        marginBottom: 2,
    },
    editButton: {
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    editButtonText: {
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
    },
    issueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    issueIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    issueText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
    },
    faqCard: {
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    faqQuestion: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
        marginLeft: 12,
    },
    faqBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingLeft: 48,
    },
    faqAnswer: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        lineHeight: 20,
    },
});

export default AccountSupportScreen;
