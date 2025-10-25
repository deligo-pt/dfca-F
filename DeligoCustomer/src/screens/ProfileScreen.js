import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getUserData, logoutUser } from '../utils/auth';
import CustomModal from '../components/CustomModal';

const ProfileScreen = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(false);
  const insets = useSafeAreaInsets();

  // Animation values for logout button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
      'Logout',
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Account</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
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
              <TouchableOpacity style={styles.editProfileButton}>
                <Text style={styles.editProfileText}>Edit profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Vouchers Card */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.voucherItem}>
              <View style={styles.voucherIconContainer}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
              </View>
              <Text style={styles.voucherText}>Vouchers</Text>
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherBadgeText}>0</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
            </TouchableOpacity>
          </View>

          {/* Your Orders Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your orders</Text>
            <MenuItem
              iconName="receipt-outline"
              title="Orders & reordering"
              showDivider={false}
            />
          </View>

          {/* Account Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account</Text>
            <MenuItem iconName="card-outline" title="Payment methods" />
            <MenuItem
              iconName="gift-outline"
              title="Referrals"
              subtitle="Invite friends & get rewards"
            />
            <MenuItem
              iconName="star-outline"
              title="pandapro"
              subtitle="Exclusive benefits & discounts"
              showDivider={false}
              iconColor="#FFB800"
            />
          </View>

          {/* More Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>More</Text>
            <MenuItem iconName="location-outline" title="Saved addresses" />
            <MenuItem iconName="heart-outline" title="Favorite orders" />
            <MenuItem iconName="notifications-outline" title="Notifications" />
            <MenuItem iconName="settings-outline" title="Settings" />
            <MenuItem iconName="help-circle-outline" title="Help center" showDivider={false} />
          </View>

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
              <Text style={styles.logoutText}>Log out</Text>
              <View style={styles.logoutArrow}>
                <Ionicons name="arrow-forward" size={20} color={colors.error} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* App Version */}
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
          confirmText="Logout"
          cancelText="Cancel"
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    paddingTop: 12,
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
