import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Image,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { sendOTP, verifyOTP, saveUserData, resendOTP } from '../utils/auth';
import { useProfile } from '../contexts/ProfileContext';
import { useProducts } from '../contexts/ProductsContext';
import CountryPicker from 'react-native-country-picker-modal';
import CustomModal from '../components/CustomModal';
import OTPInput from '../components/OTPInput';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { setAccessToken } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

const LOGO = require('../assets/images/logo.png'); // Updated Logo

const LoginScreen = ({ navigation }) => {
  const { login } = useProfile();
  const { fetchProducts } = useProducts();
  const { t, language, changeLanguage } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const BRAND_PINK = colors.primary;
  const GRAY = colors.text.secondary;
  const INFO_BG = colors.surface;
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState('mobile');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [countryCode, setCountryCode] = useState('PT'); // Default Portugal
  const [country, setCountry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnlyConfirm, setModalOnlyConfirm] = useState(true);
  const modalOnConfirmRef = React.useRef(null);
  const cardAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const showModal = (title, message, onConfirm = null, onlyConfirm = true) => {
    setModalTitle(title);
    setModalMessage(message);
    modalOnConfirmRef.current = onConfirm;
    setModalOnlyConfirm(onlyConfirm);
    setModalVisible(true);
  };

  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      showModal(t('error'), `${t('pleaseEnter')} ${loginMethod === 'mobile' ? t('mobileNumber') : t('emailAddress')}`);
      return;
    }
    if (loginMethod === 'mobile') {
      // Portugal phone numbers are 9 digits, most other countries use 10+
      const callingCode = country ? country.callingCode[0] : '351';
      const minLength = callingCode === '351' ? 9 : 10;
      if (identifier.length < minLength) {
        showModal(t('error'), t('validMobileNumber'));
        return;
      }
    } else {
      if (!identifier.includes('@')) {
        showModal(t('error'), t('validEmailAddress'));
        return;
      }
    }
    setIsLoading(true);
    try {
      const fullIdentifier = loginMethod === 'mobile' ? `+${country ? country.callingCode[0] : '351'}${identifier}` : identifier;
      // Call sendOTP and log the server response for debugging
      const sendRes = await sendOTP(fullIdentifier, loginMethod);
      console.log('[LoginScreen] sendOTP response:', sendRes);

      // If API responded with success flag, proceed to OTP screen/modal
      if (sendRes && (sendRes.success === true || sendRes.success === 'true')) {
        setIsOtpSent(true);
        showModal(
          t('otpSent'),
          // prefer server message if provided otherwise fallback to generic
          sendRes.message || t('checkOTP'),
          () => setModalVisible(false)
        );
      } else {
        // API returned but indicates failure - show message from server if present
        const msg = sendRes && (sendRes.message || sendRes.error || sendRes.msg) ? (sendRes.message || sendRes.error || sendRes.msg) : t('accountNotRegistered');
        console.warn('[LoginScreen] sendOTP reported failure:', sendRes);
        // Provide an action: navigate to HelpCenter so user can contact support or get help
        showModal(t('notRegistered'), msg, () => navigation.navigate('HelpCenter'), false);
      }
    } catch (error) {
      // error may be a rejected API response (response.data) or a network error
      console.error('[LoginScreen] sendOTP error:', error);

      // Try to extract server-provided message
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || error?.msg || error?.error;

      showModal(t('error'), serverMsg || t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showModal(t('error'), t('enterOTP'));
      return;
    }
    if (otp.length !== (loginMethod === 'mobile' ? 6 : 4)) {
      showModal(t('error'), t('invalidOTP'));
      return;
    }
    setIsLoading(true);
    try {
      const fullIdentifier = loginMethod === 'mobile' ? `+${country ? country.callingCode[0] : '351'}${identifier}` : identifier;
      const response = await verifyOTP(fullIdentifier, otp, loginMethod);
      console.log('[LoginScreen] verifyOTP response:', response);

      const accessToken = response?.accessToken;
      const userData = response?.user || null;

      // If backend didn't return token, treat as failure
      if (!accessToken) {
        showModal(t('error'), t('invalidOTP'));
        return;
      }

      // Save the access token to storage
      // Use ProfileContext login
      const success = await login(userData, accessToken);

      // Immediate data pre-load
      if (success) {
        fetchProducts({ force: true });
      }

      // Close modal
      setModalVisible(false);

      // If login failed (e.g. context error), show error (but login returns true/false)
      if (!success) {
        showModal(t('error'), t('somethingWentWrong'));
      }
      // If success, RootNavigator will auto-redirect 
    } catch (error) {
      showModal(t('error'), t('invalidOTP'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const fullIdentifier = loginMethod === 'mobile' ? `+${country ? country.callingCode[0] : '351'}${identifier}` : identifier;
      const resendRes = await resendOTP(fullIdentifier, loginMethod);
      console.log('[LoginScreen] resendOTP response:', resendRes);
      if (resendRes && resendRes.success) {
        setOtp('');
        showModal(t('otpResent'), resendRes.message || t('newOtpSent'));
      } else {
        showModal('Error', resendRes?.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('[LoginScreen] resendOTP error:', error);
      showModal('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  const handleChangeMethod = () => {
    setIdentifier('');
    setOtp('');
    setIsOtpSent(false);
    setLoginMethod(loginMethod === 'mobile' ? 'email' : 'mobile');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          {/* Top Decorative Background */}
          <View style={[styles.topShape, { backgroundColor: colors.primary }]} />
          <View style={[styles.topShapeSmall, { backgroundColor: colors.primary }]} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: colors.background }}
          >
            {/* Header & Logo */}
            <View style={styles.headerContainer}>
              <View style={styles.logoWrapper}>
                <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={[styles.welcomeText, { color: colors.text.primary }]}>
                {isOtpSent ? t('verifyOTP') : t('deligo')}
              </Text>
              <Text style={[styles.subText, { color: colors.text.secondary }]}>
                {isOtpSent ? t('enterCodeSent') : t('loginOrSignup')}
              </Text>
            </View>

            {/* Form Section - Clean, No Card */}
            <Animated.View style={[styles.formContainer, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>

              {/* Tabs */}
              {!isOtpSent && (
                <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => loginMethod !== 'mobile' && handleChangeMethod()}
                    style={[styles.tabItem, loginMethod === 'mobile' && styles.tabItemActive, { borderBottomColor: loginMethod === 'mobile' ? colors.primary : 'transparent' }]}
                  >
                    <Text style={[styles.tabLabel, { color: loginMethod === 'mobile' ? colors.primary : colors.text.secondary }]}>{t('mobile')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => loginMethod !== 'email' && handleChangeMethod()}
                    style={[styles.tabItem, loginMethod === 'email' && styles.tabItemActive, { borderBottomColor: loginMethod === 'email' ? colors.primary : 'transparent' }]}
                  >
                    <Text style={[styles.tabLabel, { color: loginMethod === 'email' ? colors.primary : colors.text.secondary }]}>{t('email')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Inputs */}
              {!isOtpSent ? (
                <View style={styles.inputsSection}>
                  {loginMethod === 'mobile' ? (
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.countryBtn}>
                        <CountryPicker
                          countryCode={countryCode}
                          withFilter
                          withFlag
                          withCallingCode
                          onSelect={country => {
                            setCountryCode(country.cca2);
                            setCountry(country);
                          }}
                        />
                        <Text style={[styles.callingCode, { color: colors.text.primary }]}>+{country ? country.callingCode[0] : '351'}</Text>
                        <Ionicons name="chevron-down" size={12} color={colors.text.secondary} style={{ marginLeft: 4 }} />
                      </View>
                      <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
                      <TextInput
                        style={[styles.inputField, { color: colors.text.primary }]}
                        placeholder={t('mobileNumber')}
                        placeholderTextColor={colors.text.secondary}
                        value={identifier}
                        onChangeText={setIdentifier}
                        keyboardType="phone-pad"
                        selectionColor={colors.primary}
                        autoCapitalize="none"
                      />
                    </View>
                  ) : (
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="mail-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.inputField, { color: colors.text.primary }]}
                        placeholder={t('emailAddress')}
                        placeholderTextColor={colors.text.secondary}
                        value={identifier}
                        onChangeText={setIdentifier}
                        keyboardType="email-address"
                        selectionColor={colors.primary}
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && { opacity: 0.7 }]}
                    onPress={handleSendOtp}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('sendOTP')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputsSection}>
                  <Text style={[styles.otpReviewText, { color: colors.text.secondary }]}>
                    {t('sentCodeTo')} <Text style={{ color: colors.text.primary, fontWeight: '700' }}>{loginMethod === 'mobile' ? `+${country ? country.callingCode[0] : '351'} ${identifier}` : identifier}</Text>
                  </Text>

                  <View style={{ marginBottom: 24 }}>
                    <OTPInput
                      length={loginMethod === 'mobile' ? 6 : 4}
                      value={otp}
                      onChangeText={setOtp}
                      disabled={isLoading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && { opacity: 0.7 }]}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('verifyOTPButton')}</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpActions}>
                    <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                      <Text style={[styles.actionLink, { color: colors.primary }]}>{t('resend')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsOtpSent(false)} disabled={isLoading}>
                      <Text style={[styles.actionLink, { color: colors.text.secondary }]}>{t('change')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Language Selection - Minimal */}
              <TouchableOpacity
                style={styles.langCapsule}
                onPress={() => setShowLanguageModal(true)}
              >
                <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
                <Text style={[styles.langText, { color: colors.text.secondary }]}>{language === 'en' ? 'English' : 'Português'}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
              </TouchableOpacity>

              {/* Footer Links */}
              <View style={styles.footerRow}>
                <Text style={[styles.footerNote, { color: colors.text.secondary }]}>{t('byContinuing')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                    <Text style={[styles.footerLink, { color: colors.primary }]}>{t('termsOfService')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.footerNote, { color: colors.text.secondary }]}> & </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                    <Text style={[styles.footerLink, { color: colors.primary }]}>{t('privacyPolicy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

          </ScrollView>

          {/* Modals */}
          <CustomModal
            visible={modalVisible}
            title={modalTitle}
            message={modalMessage}
            onConfirm={() => {
              setModalVisible(false);
              if (modalOnConfirmRef.current) modalOnConfirmRef.current();
            }}
            onCancel={() => setModalVisible(false)}
            onlyConfirm={modalOnlyConfirm}
          />

          <Modal
            visible={showLanguageModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLanguageModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowLanguageModal(false)}
            >
              <View style={[styles.languageModal, { backgroundColor: colors.surface }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('selectLanguage')}</Text>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.languageList}>
                  {[
                    { code: 'en', name: 'English', flag: '🇬🇧' },
                    { code: 'pt', name: 'Português', flag: '🇵🇹' },
                  ].map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageItem,
                        { backgroundColor: isDarkMode ? colors.background : '#F8F9FA' },
                        language === lang.code && { borderColor: colors.primary, borderWidth: 1, backgroundColor: isDarkMode ? colors.card : '#FFF0F5' }
                      ]}
                      onPress={() => {
                        changeLanguage(lang.code);
                        setShowLanguageModal(false);
                      }}
                    >
                      <Text style={{ fontSize: 24, marginRight: 12 }}>{lang.flag}</Text>
                      <Text style={[styles.languageName, { color: colors.text.primary, fontWeight: language === lang.code ? '700' : '400' }]}>{lang.name}</Text>
                      {language === lang.code && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topShape: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.1,
  },
  topShapeSmall: {
    position: 'absolute',
    top: 50,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.05,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  welcomeText: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    opacity: 0.8,
  },
  formContainer: {
    borderBottomColor: '#EEE',
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabItemActive: {
    // Active style handled by dynamic border color
  },
  tabLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  inputsSection: {
    marginBottom: 30,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 20,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  callingCode: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginLeft: 4,
  },
  dividerVertical: {
    width: 1,
    height: 24,
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    height: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  otpReviewText: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  actionLink: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  langCapsule: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 40,
    gap: 6,
  },
  langText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  footerRow: {
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  // Modal Styles (Keeping some existing structures)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  languageModal: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  languageList: {
    marginTop: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  languageName: {
    fontSize: 16,
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
});

export default LoginScreen;
