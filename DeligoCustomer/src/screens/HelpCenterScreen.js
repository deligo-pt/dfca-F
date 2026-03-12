import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

/**
 * HelpCenterScreen
 * 
 * Central hub for customer support and FAQs.
 * Features:
 * - Searchable help topics and localized FAQ categories.
 * - Quick access to support channels (Chat, Email, Phone).
 * - Interactive list of common questions.
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop.
 */
const HelpCenterScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // Memoize styles to ensure theme updates are handled efficiently
  const styles = useMemo(() => createStyles(colors), [colors]);

  const faqCategories = [
    { id: 1, icon: 'help-circle-outline', title: t('faqs'), description: t('findAnswers') },
    { id: 2, icon: 'receipt-outline', title: t('orderIssues'), description: t('trackModifyReport') },
    { id: 3, icon: 'card-outline', title: t('paymentRefunds'), description: t('billingQuestions') },
    { id: 4, icon: 'person-outline', title: t('accountProfile'), description: t('manageAccountSettings') },
  ];

  const quickActions = [
    { id: 1, icon: 'chatbubbles-outline', title: t('liveChat'), subtitle: t('chatWithSupport'), color: colors.primary },
    { id: 2, icon: 'mail-outline', title: t('emailUs'), subtitle: 'contact@deligo.pt', color: colors.info },
    { id: 3, icon: 'call-outline', title: t('callUs'), subtitle: '+351 920 136 680', color: colors.success },
  ];

  const handleQuickAction = (action) => {
    if (action.id === 2) {
      Linking.openURL('mailto:contact@deligo.pt');
    } else if (action.id === 3) {
      Linking.openURL('tel:+351920136680');
    } else {
      // Open live chat modal
      navigation.navigate('LiveChat');
    }
  };

  const handleCategoryPress = (category) => {
    if (category.id === 1) { // FAQs
      navigation.navigate('FAQs');
    } else if (category.id === 2) { // Order Issues
      navigation.navigate('OrderIssues');
    } else if (category.id === 3) { // Payment & Refunds
      navigation.navigate('PaymentRefunds');
    } else if (category.id === 4) { // Account & Profile
      navigation.navigate('AccountProfileHelp');
    }
    // Handle other categories if needed
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar
        barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: colors.text.primary }]}>{t('helpCenter')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>


        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('contactSupport')}</Text>
          {quickActions.map(action => (
            <TouchableOpacity key={action.id} style={[styles.quickActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleQuickAction(action)}>
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={[styles.quickActionTitle, { color: colors.text.primary }]}>{action.title}</Text>
                <Text style={[styles.quickActionSubtitle, { color: colors.text.secondary }]}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('browseTopics')}</Text>
          {faqCategories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleCategoryPress(category)}
            >
              <View style={styles.categoryIconContainer}>
                <Ionicons name={category.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.categoryContent}>
                <Text style={[styles.categoryTitle, { color: colors.text.primary }]}>{category.title}</Text>
                <Text style={[styles.categoryDescription, { color: colors.text.secondary }]}>{category.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('popularQuestions')}</Text>

          <FAQItem
            question={t('howTrackOrder')}
            answer={t('howTrackOrderAnswer')}
            colors={colors}
            styles={styles}
          />

          <FAQItem
            question={t('deliveryCharges')}
            answer={t('deliveryChargesAnswer')}
            colors={colors}
            styles={styles}
          />
          <FAQItem
            question={t('applyVoucherQuestion')}
            answer={t('applyVoucherAnswer')}
            colors={colors}
            styles={styles}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const FAQItem = ({ question, answer, colors, styles }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.questionCardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.questionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.questionText, { color: colors.text.primary }]}>{question}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.text.light} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.answerContainer}>
          <Text style={[styles.answerText, { color: colors.text.secondary }]}>{answer}</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
    color: colors.text.primary,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: colors.surface,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.15)',
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
  questionCardContainer: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 48, // Align with text
  },
  answerText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
});

export default HelpCenterScreen;
