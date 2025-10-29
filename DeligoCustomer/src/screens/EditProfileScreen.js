import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getUserData } from '../utils/auth';
import { useLanguage } from '../utils/LanguageContext';

const EditProfileScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await getUserData();
    setUser(userData);
    setName(userData?.name || '');
    setEmail(userData?.email || '');
    setMobile(userData?.mobile || '');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert(t('success'), t('profileUpdated'));
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('editProfile')}</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
          <Text style={styles.editButtonText}>{isEditing ? t('cancel') : t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={styles.changePhotoText}>{t('changePhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('fullName')}</Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('enterYourName')}
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('emailAddress')}</Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('enterYourEmail')}
                keyboardType="email-address"
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('mobileNumber')}</Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
              <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                placeholder={t('enterYourMobile')}
                keyboardType="phone-pad"
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
          </TouchableOpacity>
        )}
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
  editButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: 'Poppins-Medium',
  },
  content: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.background,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text.white,
    fontFamily: 'Poppins-Bold',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F6',
  },
  changePhotoText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },
  formSection: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  inputContainerActive: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.white,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default EditProfileScreen;

