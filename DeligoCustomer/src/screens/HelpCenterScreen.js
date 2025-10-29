import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useLanguage } from '../utils/LanguageContext';

const HelpCenterScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const faqCategories = [
    { id: 1, icon: 'help-circle-outline', title: t('faqs'), description: t('findAnswers') },
    { id: 2, icon: 'receipt-outline', title: t('orderIssues'), description: t('trackModifyReport') },
    { id: 3, icon: 'card-outline', title: t('paymentRefunds'), description: t('billingQuestions') },
    { id: 4, icon: 'person-outline', title: t('accountProfile'), description: t('manageAccountSettings') },
  ];

  const quickActions = [
    { id: 1, icon: 'chatbubbles-outline', title: t('liveChat'), subtitle: t('chatWithSupport'), color: colors.primary },
    { id: 2, icon: 'mail-outline', title: t('emailUs'), subtitle: 'support@deligo.com', color: colors.info },
    { id: 3, icon: 'call-outline', title: t('callUs'), subtitle: '+91 1800-123-456', color: colors.success },
  ];

  const handleQuickAction = (action) => {
    if (action.id === 2) {
      Linking.openURL('mailto:support@deligo.com');
    } else if (action.id === 3) {
      Linking.openURL('tel:+911800123456');
    } else {
      // Live chat placeholder
      console.log('Open live chat');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('helpCenter')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('howCanWeHelp')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.light}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contactSupport')}</Text>
          {quickActions.map(action => (
            <TouchableOpacity key={action.id} style={styles.quickActionCard} onPress={() => handleQuickAction(action)}>
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('browseTopics')}</Text>
          {faqCategories.map(category => (
            <TouchableOpacity key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryIconContainer}>
                <Ionicons name={category.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('popularQuestions')}</Text>

          <TouchableOpacity style={styles.questionCard}>
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.questionText}>{t('howTrackOrder')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.questionCard}>
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.questionText}>{t('cancelOrder')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.questionCard}>
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.questionText}>{t('deliveryCharges')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.questionCard}>
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.questionText}>{t('applyVoucherQuestion')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
  },
});

export default HelpCenterScreen;
