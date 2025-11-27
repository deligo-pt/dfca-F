import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../utils/ThemeContext'; // Adjust path as needed
import { useLanguage } from '../../utils/LanguageContext'; // Adjust path as needed

const UserProfileCard = ({ user, navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
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
  );
};

const styles = StyleSheet.create({
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
});

export default UserProfileCard;
