import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getUserData, logoutUser } from '../utils/auth';
import CustomModal from '../components/CustomModal';
import { useLanguage } from '../utils/LanguageContext';

const ProfileScreen = ({ onLogout, navigation }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(false);

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
        setModalVisible(false);
        await logoutUser();
        if (onLogout) {
          onLogout();
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
          <View style={[styles.menuIconContainer, pressed && styles.menuIconContainerPressed]}>
            <Ionicons
              name={iconName}
              size={22}
              color={iconColor || colors.primary}
            />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuText}>{title}</Text>
            {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
        </TouchableOpacity>
        {showDivider && <View style={styles.menuDivider} />}
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header - Scrolls with content */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Deligo</Text>
                <Text style={styles.headerSubtitle}>Your favorite food, delivered fast 🍔</Text>
              </View>
            </View>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
              <Text style={styles.userContact}>{user?.email || user?.mobile || 'No contact info'}</Text>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editProfileText}>{t('editProfile')}</Text>
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
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.voucherItem}
              onPress={() => navigation.navigate('Vouchers')}
            >
              <View style={styles.voucherIconContainer}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
              </View>
              <Text style={styles.voucherText}>{t('vouchers')}</Text>
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherBadgeText}>0</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          </View>

          {/* Your Orders Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('orders')}</Text>
            <MenuItem
              iconName="receipt-outline"
              title={t('orders')}
              onPress={() => navigation.navigate('Orders')}
              showDivider={false}
            />
          </View>

          {/* Account Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('account')}</Text>
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
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>More</Text>
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
            style={styles.referralBanner}
            onPress={() => navigation.navigate('Referrals')}
            activeOpacity={0.85}
          >
            <View style={styles.referralContent}>
              <View style={styles.referralLeft}>
                <Text style={styles.referralEmoji}>🎉</Text>
              </View>
              <View style={styles.referralMiddle}>
                <Text style={styles.referralTitle}>Invite Friends, Earn Rewards!</Text>
                <Text style={styles.referralSubtitle}>Give $10, Get $10 for each friend</Text>
              </View>
              <View style={styles.referralRight}>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Logout Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogoutPress}
              activeOpacity={0.8}
            >
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
              </View>
              <Text style={styles.logoutText}>{t('logout')}</Text>
              <View style={styles.logoutArrow}>
                <Ionicons name="arrow-forward" size={20} color={colors.error} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* App Version */}
          <Text style={styles.versionText}>{t('version')}</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  content: {
    // No top padding needed since header is inside ScrollView
  },
  // Profile Card Styles
  profileCard: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.white,
    fontFamily: 'Poppins-Bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  // Card Styles
  card: {
    backgroundColor: colors.background,
    marginBottom: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
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
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  voucherText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: 'Poppins-Medium',
  },
  voucherBadge: {
    backgroundColor: colors.primary,
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
    color: colors.text.white,
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
    backgroundColor: '#FFF5E6',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
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
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 13,
    color: colors.primary,
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
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuIconContainerPressed: {
    backgroundColor: '#F0F0F0',
    transform: [{ scale: 0.95 }],
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: 'Poppins-Medium',
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
  // Logout Button - Modern & Animated
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F7',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFE0E8',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  logoutArrow: {
    opacity: 0.7,
  },
  versionText: {
    fontSize: 12,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
});

export default ProfileScreen;

