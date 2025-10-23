import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../theme';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.headerText}>Profile</Text>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
            <Text style={styles.userMobile}>{user?.mobile || 'No mobile'}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuText}>Edit Profile</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>📍</Text>
              <Text style={styles.menuText}>Saved Addresses</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>💳</Text>
              <Text style={styles.menuText}>Payment Methods</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🔔</Text>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuText}>Settings</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>❓</Text>
              <Text style={styles.menuText}>Help & Support</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    padding: 20,
    paddingTop: 60,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 20,
  },
  userCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginBottom: spacing.xs,
  },
  userMobile: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  menuSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.text.light,
  },
  logoutButton: {
    backgroundColor: '#FEE',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default ProfileScreen;
