import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
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

const ProfileScreen = ({ onLogout, navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, fetchProfile, logout } = useProfile();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Animation values for logout button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const showModal = (title, message, onConfirm = null, onlyConfirm = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOnConfirm(() => onConfirm);
    setModalOnlyConfirm(onlyConfirm);
    setModalVisible(true);
  };

  useEffect(() => {
    // If caller wants fresh profile, fetch from server; otherwise context user is used
    if (!user) {
      (async () => {
        const res = await fetchProfile().catch(e => e);
        if (res && res.status === 401) {
          // Session expired -> inform user and navigate to login
          showModal(t('error'), t('sessionExpired') || 'Session expired. Please login again.', () => {
            setModalVisible(false);
            if (onLogout) onLogout();
          }, true);
        }
      })();
    }
  }, []);

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
      'Are you sure you want to logout?',
      async () => {
        // Keep modal open while logout happens and show a loader in the button
        setIsLoggingOut(true);
        try {
          const result = await logout();

          setIsLoggingOut(false);
          setModalVisible(false);

          if (result && result.success) {
            if (onLogout) onLogout();
            return;
          }

          if (result && result.status === 401) {
            if (onLogout) onLogout();
            return;
          }

          showModal(
            t('error'),
            result?.message || 'Logout failed. Please try again.',
            () => setModalVisible(false),
            true,
          );
        } catch (err) {
          console.warn('[ProfileScreen] logout error:', err);
          setIsLoggingOut(false);
          setModalVisible(false);
        }
      },
      false
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
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
          <ProfileSection title="More">
            <MenuItem
              iconName="location-outline"
              title={t('savedAddresses')}
              onPress={() => navigation.navigate('SavedAddresses')}
            />
            <MenuItem iconName="heart-outline" title="Favorite orders" />
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
