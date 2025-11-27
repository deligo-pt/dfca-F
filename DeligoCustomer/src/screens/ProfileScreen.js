import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { getUserData, logoutUser } from '../utils/auth';
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

const ProfileScreen = ({ onLogout, navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Animation values for logout button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await getUserData();
    setUser(userData);
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
      'Are you sure you want to logout?',
      async () => {
        // Keep modal open while logout happens and show a loader in the button
        setIsLoggingOut(true);
        try {
          // Read token from storage and pass it into logoutUser to ensure server receives the exact stored token
          const tokenFromStorage = await (StorageService.getAccessToken ? StorageService.getAccessToken() : StorageService.getItem('userToken'));
          const result = await logoutUser(tokenFromStorage);

           // Stop loader and close the confirmation modal
           setIsLoggingOut(false);
           setModalVisible(false);

           // Handle API result: success -> navigate; failure -> show informative modal
           if (result && result.success) {
             // Successful logout
             if (onLogout) {
               onLogout();
             }
             return;
           }

           // If unauthorized (token invalid/expired), still navigate to login but inform the user
           if (result && result.status === 401) {
             // Token invalid/expired: perform local logout/navigation immediately.
             console.warn('[ProfileScreen] logout returned 401 - treating as session expired');
             if (onLogout) onLogout();
             return;
           }

           // Generic failure message
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
