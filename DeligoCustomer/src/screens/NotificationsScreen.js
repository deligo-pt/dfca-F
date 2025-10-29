import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useLanguage } from '../utils/LanguageContext';

const NotificationsScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    orderUpdates: true,
    offers: true,
    newRestaurants: false,
    newsletter: false,
    push: true,
    email: false,
    sms: true,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SettingItem = ({ icon, title, subtitle, settingKey }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: '#E0E0E0', true: colors.secondary }}
        thumbColor={settings[settingKey] ? colors.primary : '#F5F5F5'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('notifications')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notificationTypes')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="receipt-outline"
              title={t('orderUpdatesText')}
              subtitle={t('getNotifiedOrderStatus')}
              settingKey="orderUpdates"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="pricetag-outline"
              title={t('offersPromotions')}
              subtitle={t('receiveDeals')}
              settingKey="offers"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="restaurant-outline"
              title={t('newRestaurants')}
              subtitle={t('updatesNewRestaurants')}
              settingKey="newRestaurants"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mail-outline"
              title={t('newsletter')}
              subtitle={t('weeklyFoodTrends')}
              settingKey="newsletter"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('deliveryMethod')}</Text>
          <View style={styles.card}>
            <SettingItem
              icon="notifications-outline"
              title={t('pushNotifications')}
              subtitle={t('instantAlerts')}
              settingKey="push"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mail-outline"
              title={t('emailText')}
              subtitle={t('updatesViaEmail')}
              settingKey="email"
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble-outline"
              title={t('smsText')}
              subtitle={t('textMessages')}
              settingKey="sms"
            />
          </View>
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
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
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
    backgroundColor: '#F8F8F8',
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
});

export default NotificationsScreen;
