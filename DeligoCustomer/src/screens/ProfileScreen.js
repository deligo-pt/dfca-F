/**
 * ProfileScreen
 * 
 * Central hub for user account management, displaying key profile information
 * and providing navigation to settings, orders, and support.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Animated, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { getUserData } from '../utils/auth';
import { useProfile } from '../contexts/ProfileContext';
import StorageService from '../utils/storage';
import CouponAPI from '../utils/couponApi';
import CustomModal from '../components/CustomModal';
import { useLanguage } from '../utils/LanguageContext';
import MenuItem from '../components/Profile/MenuItem';
import ProfileHeader from '../components/Profile/ProfileHeader';
import UserProfileCard from '../components/Profile/UserProfileCard';

import VouchersCard from '../components/Profile/VouchersCard';

import LogoutButton from '../components/Profile/LogoutButton';
import ProfileSection from '../components/Profile/ProfileSection';
import AppVersionText from '../components/Profile/AppVersionText';
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = ({ onLogout, navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { logout } = useProfile();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values for logout button
  const [voucherCount, setVoucherCount] = useState(0);

  // Animation values for logout button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchVoucherCount();
    }, [])
  );

  const loadUserData = async () => {
    const userData = await getUserData();
    setUser(JSON.parse(JSON.stringify(userData)));
  };

  const fetchVoucherCount = async () => {
    try {
      const res = await CouponAPI.getCoupons();
      if (res.success && Array.isArray(res.data)) {
        // Filter only active vouchers
        const active = res.data.filter(c => c.isActive !== false);
        setVoucherCount(active.length);
      }
    } catch (err) {
      console.warn('Failed to fetch voucher count', err);
    }
  };

  const showModal = (title, message, onConfirm = null, onlyConfirm = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOnConfirm(() => onConfirm);
    setModalOnlyConfirm(onlyConfirm);
    setModalVisible(true);
  };

  const handleLockedFeature = () => {
    const title = t('lockedFeatureTitle');
    const message = t('lockedFeatureMessage');

    // Fallback if translation returns the key itself
    const displayTitle = title === 'lockedFeatureTitle' ? 'Unlock Exclusive Features' : title;
    const displayMessage = message === 'lockedFeatureMessage'
      ? 'Use the app regularly and place more orders to unlock and enjoy these exclusive features.'
      : message;

    showModal(
      displayTitle,
      displayMessage,
      () => setModalVisible(false),
      true // onlyConfirm
    );
  };

  const handleLogoutPress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    handleLogout();
  };

  const handleLogout = () => {
    showModal(
      t('logout'),
      t('logoutConfirmation'),
      async () => {
        setIsLoggingOut(true);
        try {
          await logout();

          if (onLogout) {
            onLogout();
          }
        } catch (err) {
          console.warn('[ProfileScreen] logout error:', err);
        } finally {
          setIsLoggingOut(false);
          setModalVisible(false);
        }
      },
      false
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    fetchVoucherCount();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ProfileHeader />

          <UserProfileCard user={user} navigation={navigation} />



          <VouchersCard navigation={navigation} count={voucherCount} />

          <ProfileSection title={t('orders')}>
            <MenuItem
              iconName="receipt-outline"
              title={t('orders')}
              onPress={() => navigation.navigate('Orders')}
              showDivider={false}
            />
          </ProfileSection>

          <ProfileSection title={t('account')}>
            <MenuItem
              iconName="card-outline"
              title={t('paymentMethods')}
              onPress={() => navigation.navigate('PaymentMethods')}
            />
            <MenuItem
              iconName="gift-outline"
              title={t('referrals')}
              subtitle={t('earnRewards')}
              onPress={handleLockedFeature}
            />
            <MenuItem
              iconName="star-outline"
              title={t('deligopro')}
              subtitle={t('exclusiveBenefits')}
              showDivider={false}
              iconColor="#FFB800"
              onPress={handleLockedFeature}
            />
          </ProfileSection>

          <ProfileSection title={t('more')}>
            <MenuItem
              iconName="location-outline"
              title={t('savedAddresses')}
              onPress={() => navigation.navigate('SavedAddresses')}
            />
            <MenuItem
              iconName="heart-outline"
              title={t('favoriteOrders')}
              onPress={() => navigation.navigate('FavoriteOrders')}
            />
            <MenuItem
              iconName="notifications-outline"
              title={t('notifications')}
              onPress={() => navigation.navigate('Notifications')}
            />
            <MenuItem
              iconName="settings-outline"
              title={t('settings')}
              onPress={() => navigation.navigate('Settings')}
            />
            <MenuItem
              iconName="help-circle-outline"
              title={t('helpCenter')}
              showDivider={false}
              onPress={() => navigation.navigate('HelpCenter')}
            />
          </ProfileSection>



          <LogoutButton
            onLogoutPress={handleLogoutPress}
            isLoggingOut={isLoggingOut}
            scaleAnim={scaleAnim}
            onLogoutSuccess={onLogout}
          />

          <AppVersionText />
        </ScrollView>

        <CustomModal
          visible={modalVisible}
          title={modalTitle}
          message={modalMessage}
          onConfirm={() => {
            if (modalOnConfirm) modalOnConfirm();
          }}
          onCancel={() => setModalVisible(false)}
          onlyConfirm={modalOnlyConfirm}
          confirmText={modalOnlyConfirm ? 'OK' : t('logout')}
          cancelText={t('cancel')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    // No top padding needed since header is inside ScrollView
  },
});

export default ProfileScreen;
