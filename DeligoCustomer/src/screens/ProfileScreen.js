import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { getUserData, logoutUser } from '../utils/auth';
import StorageService from '../utils/storage';
import CustomModal from '../components/CustomModal';
import { useLanguage } from '../utils/LanguageContext';

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

  const MenuItem = ({ iconName, title, subtitle, onPress, showDivider = true, iconColor }) => {
    const [pressed, setPressed] = useState(false);

    return (
      <>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.menuIconContainer,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && [styles.menuIconContainerPressed, { backgroundColor: colors.border }]
          ]}>
            <Ionicons
              name={iconName}
              size={22}
              color={iconColor || colors.primary}
            />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: colors.text.primary }]}>{title}</Text>
            {subtitle && <Text style={[styles.menuSubtitle, { color: colors.text.secondary }]}>{subtitle}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
        </TouchableOpacity>
        {showDivider && <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />}
      </>
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
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Deligo</Text>
                <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>Your favorite food, delivered fast 🍔</Text>
              </View>
            </View>
          </View>

          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name || 'Guest User'}</Text>
              <Text style={[styles.userContact, { color: colors.text.secondary }]}>{user?.email || user?.mobile || 'No contact info'}</Text>
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={[styles.editProfileText, { color: colors.primary }]}>{t('editProfile')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Deligo Pro Promotional Banner */}
          <TouchableOpacity style={styles.proBanner} activeOpacity={0.85}>
            <View style={styles.proContent}>
              <View style={styles.proIconWrapper}>
                <Ionicons name="diamond" size={28} color="#FFB800" />
              </View>
              <View style={styles.proTextContainer}>
                <View style={styles.proTitleRow}>
                  <Text style={styles.proTitle}>Try Deligo Pro</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </View>
                <Text style={styles.proSubtitle}>Unlimited free delivery + exclusive deals</Text>
                <Text style={styles.proOffer}>🎁 First month free • Save up to $50/month</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="#FFB800" />
            </View>
          </TouchableOpacity>

          {/* Vouchers Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.voucherItem}
              onPress={() => navigation.navigate('Vouchers')}
            >
              <View style={[styles.voucherIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.voucherText, { color: colors.text.primary }]}>{t('vouchers')}</Text>
              <View style={[styles.voucherBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.voucherBadgeText}>0</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          </View>

          {/* Your Orders Section */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('orders')}</Text>
            <MenuItem
              iconName="receipt-outline"
              title={t('orders')}
              onPress={() => navigation.navigate('Orders')}
              showDivider={false}
            />
          </View>

          {/* Account Section */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('account')}</Text>
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
          </View>

          {/* More Section */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>More</Text>
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
          </View>

          {/* Referral Promotion Banner */}
          <TouchableOpacity
            style={[styles.referralBanner, { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => navigation.navigate('Referrals')}
            activeOpacity={0.85}
          >
            <View style={styles.referralContent}>
              <View style={styles.referralLeft}>
                <Text style={styles.referralEmoji}>🎉</Text>
              </View>
              <View style={styles.referralMiddle}>
                <Text style={[styles.referralTitle, { color: colors.text.primary }]}>Invite Friends, Earn Rewards!</Text>
                <Text style={[styles.referralSubtitle, { color: colors.primary }]}>Give $10, Get $10 for each friend</Text>
              </View>
              <View style={styles.referralRight}>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Logout Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isLoggingOut && { opacity: 0.7 },
              ]}
              onPress={handleLogoutPress}
              activeOpacity={0.8}
              disabled={isLoggingOut}
            >
              <View style={[styles.logoutIconContainer, { backgroundColor: `${colors.error}15` }]}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
              </View>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.error} style={{ flex: 1 }} />
              ) : (
                <>
                  <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
                  <View style={styles.logoutArrow}>
                    <Ionicons name="arrow-forward" size={20} color={colors.error} />
                  </View>
                </>
              )}

            </TouchableOpacity>
          </Animated.View>

          {/* App Version */}
          <Text style={[styles.versionText, { color: colors.text.light }]}>{t('version')}</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  content: {
    // No top padding needed since header is inside ScrollView
  },
  // Profile Card Styles
  profileCard: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  // Card Styles
  card: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Voucher Styles
  voucherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  voucherIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  voucherText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  voucherBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
    minWidth: 28,
    alignItems: 'center',
  },
  voucherBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  // Deligo Pro Banner Styles
  proBanner: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  proContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  proIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  proTextContainer: {
    flex: 1,
  },
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginRight: 8,
  },
  freeBadge: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Poppins-Bold',
  },
  proSubtitle: {
    fontSize: 13,
    color: '#E0E0E0',
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  proOffer: {
    fontSize: 12,
    color: '#FFB800',
    fontFamily: 'Poppins-SemiBold',
  },
  // Referral Banner Styles
  referralBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  referralLeft: {
    marginRight: 12,
  },
  referralEmoji: {
    fontSize: 42,
  },
  referralMiddle: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  referralRight: {
    marginLeft: 8,
  },
  // Menu Item Styles
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  menuIconContainerPressed: {
    transform: [{ scale: 0.95 }],
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  menuSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginLeft: 80,
  },
  // Logout Button - Modern & Animated
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  logoutArrow: {
    opacity: 0.7,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
});

export default ProfileScreen;

