import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Animated, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { getUserData } from '../utils/auth';
import { useProfile } from '../contexts/ProfileContext';
import StorageService from '../utils/storage';
import CustomModal from '../components/CustomModal';
import { useLanguage } from '../utils/LanguageContext';
import MenuItem from '../components/Profile/MenuItem';
import ProfileHeader from '../components/Profile/ProfileHeader';
import UserProfileCard from '../components/Profile/UserProfileCard';
import DeligoProBanner from '../components/Profile/DeligoProBanner';
import VouchersCard from '../components/Profile/VouchersCard';
import ReferralBanner from '../components/Profile/ReferralBanner';
import LogoutButton from '../components/Profile/LogoutButton';
import ProfileSection from '../components/Profile/ProfileSection';
import AppVersionText from '../components/Profile/AppVersionText'; // Import the new AppVersionText component
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = ({ onLogout, navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    const userData = await getUserData();
    setUser(JSON.parse(JSON.stringify(userData)));
  };

  const showModal = (title, message, onConfirm = null, onlyConfirm = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOnConfirm(() => onConfirm);
    setModalOnlyConfirm(onlyConfirm);
    setModalVisible(true);
  };

  const handleLogoutPress = () => {
    // Animate button press
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
          // Use context logout which handles state updates and navigation trigger
          await logout();

          if (onLogout) {
            onLogout();
          }
        } catch (err) {
          console.warn('[ProfileScreen] logout error:', err);
          // Context logout forces cleanup even on error, so we should be good.
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
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header - Scrolls with content */}
          <ProfileHeader />

          {/* User Profile Card */}
          <UserProfileCard user={user} navigation={navigation} />

          {/* Deligo Pro Promotional Banner */}
          <DeligoProBanner />

          {/* Vouchers Card */}
          <VouchersCard navigation={navigation} />

          {/* Your Orders Section */}
          <ProfileSection title={t('orders')}>
            <MenuItem
              iconName="receipt-outline"
              title={t('orders')}
              onPress={() => navigation.navigate('Orders')}
              showDivider={false}
            />
          </ProfileSection>

          {/* Account Section */}
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
              onPress={() => navigation.navigate('Referrals')}
            />
            <MenuItem
              iconName="star-outline"
              title={t('deligopro')}
              subtitle={t('exclusiveBenefits')}
              showDivider={false}
              iconColor="#FFB800"
            />
          </ProfileSection>

          {/* More Section */}
          <ProfileSection title={t('more')}>
            <MenuItem
              iconName="location-outline"
              title={t('savedAddresses')}
              onPress={() => navigation.navigate('SavedAddresses')}
            />
            <MenuItem iconName="heart-outline" title={t('favoriteOrders')} />
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

          {/* Referral Promotion Banner */}
          <ReferralBanner navigation={navigation} />

          {/* Logout Button */}
          <LogoutButton
            onLogoutPress={handleLogoutPress}
            isLoggingOut={isLoggingOut}
            scaleAnim={scaleAnim}
            onLogoutSuccess={onLogout}
          />

          {/* App Version */}
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
          confirmText={t('logout')}
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
