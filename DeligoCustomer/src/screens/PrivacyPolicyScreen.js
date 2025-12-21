import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const PrivacyPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('privacyPolicyTitle')}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.closeText, { color: colors.text.primary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('privacyMatters')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('privacyIntro')}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('dataCollection')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('dataCollectionText')}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('dataUsage')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('dataUsageText')}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('dataSharing')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('dataSharingText')}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('security')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('securityText')}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('privacyContactUs')}</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>{t('privacyContactUsText')}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    top: 56,
    padding: 8,
  },
  closeText: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default PrivacyPolicyScreen;
