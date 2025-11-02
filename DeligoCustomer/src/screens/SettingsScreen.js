import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { language, changeLanguage, t } = useLanguage();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  const [settings, setSettings] = useState({
    darkMode: isDarkMode,
    notifications: true,
    locationServices: true,
  });

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Sync dark mode state with theme context
  useEffect(() => {
    setSettings(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  const toggleSetting = (key) => {
    if (key === 'darkMode') {
      toggleTheme();
    } else {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleLanguageSelect = async (lang) => {
    await changeLanguage(lang.code);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(l => l.code === language);
    return lang ? lang.name : 'English';
  };

  // Dynamic styles based on theme
  const styles = StyleSheet.create({
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
      backgroundColor: colors.surface,
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
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      fontFamily: 'Poppins-SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    settingIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.background : '#F8F8F8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
      fontFamily: 'Poppins-Medium',
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 72,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
      maxHeight: '50%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    languageList: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: isDarkMode ? colors.background : '#F8F8F8',
      borderRadius: 12,
      marginBottom: 12,
    },
    languageItemSelected: {
      backgroundColor: isDarkMode ? colors.primary + '20' : colors.secondary + '40',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    languageFlag: {
      fontSize: 32,
      marginRight: 16,
    },
    languageName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
      fontFamily: 'Poppins-Medium',
      flex: 1,
    },
    languageNameSelected: {
      color: colors.primary,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
    },
  });


  const SettingItem = ({ icon, title, subtitle, onPress, hasToggle, settingKey, hasChevron = true }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={hasToggle}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {hasToggle ? (
        <Switch
          value={settings[settingKey]}
          onValueChange={() => toggleSetting(settingKey)}
          trackColor={{ false: '#E0E0E0', true: colors.secondary }}
          thumbColor={settings[settingKey] ? colors.primary : '#F5F5F5'}
        />
      ) : hasChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('appSettings')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="moon-outline"
              title={t('darkMode')}
              subtitle={t('switchDarkTheme')}
              hasToggle={true}
              settingKey="darkMode"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="notifications-outline"
              title={t('notifications')}
              subtitle={t('manageNotifications')}
              hasToggle={true}
              settingKey="notifications"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="location-outline"
              title={t('locationServices')}
              subtitle={t('allowLocation')}
              hasToggle={true}
              settingKey="locationServices"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="globe-outline"
              title={t('language')}
              subtitle={getCurrentLanguageName()}
              onPress={() => setShowLanguageModal(true)}
            />
          </View>
        </View>

        {/* Order Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orderPreferences')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="time-outline"
              title={t('defaultDeliveryTime')}
              subtitle={t('asap')}
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="restaurant-outline"
              title={t('dietaryPreferences')}
              subtitle={t('noneSet')}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="document-text-outline"
              title={t('termsOfService')}
              onPress={() => navigation.navigate('TermsOfService')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shield-outline"
              title={t('privacyPolicy')}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="information-circle-outline"
              title={t('about')}
              subtitle={t('version')}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="trash-outline"
              title={t('deleteAccount')}
              subtitle={t('permanentlyDelete')}
              onPress={() => {}}
              hasChevron={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    language === lang.code && styles.languageItemSelected
                  ]}
                  onPress={() => handleLanguageSelect(lang)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    language === lang.code && styles.languageNameSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};


export default SettingsScreen;

