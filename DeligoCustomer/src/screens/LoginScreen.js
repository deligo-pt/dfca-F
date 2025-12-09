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
} from 'react-native';
import { sendOTP, verifyOTP, saveUserData, resendOTP } from '../utils/auth';
import CountryPicker from 'react-native-country-picker-modal';
import CustomModal from '../components/CustomModal';
import OTPInput from '../components/OTPInput';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { setAccessToken } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

const LOGO = require('../assets/images/logo.png'); // Transparent logo icon

const LoginScreen = ({ onLoginSuccess, navigation }) => {
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
      if (identifier.length < 10) {
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
      const serverMsg = error && (error.message || error.msg || error.error || error.message?.toString());

      if (serverMsg) {
        showModal(t('notRegistered'), serverMsg.toString(), () => navigation.navigate('HelpCenter'), false);
      } else if (error && error.status === 404) {
        showModal(t('notRegistered'), t('accountNotRegistered'), () => navigation.navigate('HelpCenter'), false);
      } else {
        // Generic fallback
        showModal(t('error'), t('somethingWentWrong'));
      }
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
      await setAccessToken(accessToken);

      // Save user only if present
      if (userData) {
        await saveUserData(userData);
      }

      // Close modal and notify parent (pass userData or null)
      setModalVisible(false);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Soft gradient background */}
      <View style={[styles.gradientBg, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            {/* Modern logo image, no border or card */}
            <Image source={LOGO} style={styles.logoImageModern} resizeMode="contain" />
            <Text style={[styles.logoText, { color: colors.text.primary }]}>{t('deligo')}</Text>
            <Text style={[styles.tagline, { color: colors.text.secondary }]}>{t('tagline')}</Text>
          </View>

          {/* Main Card with animation */}
          <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{isOtpSent ? t('verifyOTP') : t('loginOrSignup')}</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{isOtpSent ? t('enterCodeSent') : t('enterToContinue')}</Text>

            {/* Tabs */}
            {!isOtpSent && (
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, { backgroundColor: colors.background }, loginMethod === 'mobile' && { backgroundColor: colors.primary }]}
                  onPress={() => loginMethod !== 'mobile' && handleChangeMethod()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, { color: colors.text.secondary }, loginMethod === 'mobile' && { color: '#FFFFFF' }]}>{t('mobile')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, { backgroundColor: colors.background }, loginMethod === 'email' && { backgroundColor: colors.primary }]}
                  onPress={() => loginMethod !== 'email' && handleChangeMethod()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, { color: colors.text.secondary }, loginMethod === 'email' && { color: '#FFFFFF' }]}>{t('email')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input Fields */}
            {!isOtpSent ? (
              <View style={styles.inputContainer}>
                {loginMethod === 'mobile' && (
                  <View style={styles.inputRow}>
                    <CountryPicker
                      countryCode={countryCode}
                      withFilter
                      withFlag
                      withCallingCode
                      onSelect={country => {
                        setCountryCode(country.cca2);
                        setCountry(country);
                      }}
                      containerButtonStyle={styles.countryPicker}
                    />
                    <Text style={[styles.countryCodeText, { color: colors.text.primary }]}>+{country ? country.callingCode[0] : '351'}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border, flex: 1 }]}
                      placeholder={t('mobileNumber')}
                      placeholderTextColor={GRAY}
                      value={identifier}
                      onChangeText={setIdentifier}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      maxLength={15}
                      selectionColor={BRAND_PINK}
                    />
                  </View>
                )}
                {loginMethod === 'email' && (
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border }]}
                    placeholder={t('emailAddress')}
                    placeholderTextColor={GRAY}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor={BRAND_PINK}
                  />
                )}
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>{isLoading ? t('sending') : t('sendOTP')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <OTPInput
                  length={loginMethod === 'mobile' ? 6 : 4}
                  value={otp}
                  onChangeText={setOtp}
                  disabled={isLoading}
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>{isLoading ? t('verifying') : t('verifyOTPButton')}</Text>
                </TouchableOpacity>
                <View style={styles.resendContainer}>
                  <Text style={[styles.resendText, { color: colors.text.secondary }]}>{t('didntReceiveOTP')} </Text>
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={[styles.resendLink, { color: colors.primary }]}>{t('resend')}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.changeButton} onPress={() => setIsOtpSent(false)}>
                  <Text style={[styles.changeButtonText, { color: colors.text.secondary }]}>{t('change')} {loginMethod === 'mobile' ? t('number') : t('email')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Collapsible Info Banner (optional) */}
            {showInfo && (
              <View style={[styles.infoBanner, { backgroundColor: INFO_BG }]}>
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>Demo: Use any valid mobile or email and OTP 1234 for testing.</Text>
                <TouchableOpacity style={styles.infoClose} onPress={() => setShowInfo(false)}>
                  <Text style={{ color: BRAND_PINK, fontWeight: 'bold' }}>×</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Language Selection Button (inspired design) */}
            <Animated.View style={{ opacity: cardAnim }}>
              <TouchableOpacity
                style={[styles.languageButton, { borderColor: colors.border }]}
                onPress={() => setShowLanguageModal(true)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.languageButtonText, { color: colors.text.secondary }]}>
                  {language === 'en' ? 'English' : 'Português'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.text.secondary }]}>{t('byContinuing')} </Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={[styles.footerLink, { color: colors.primary }]}>{t('termsOfService')}</Text>
                </TouchableOpacity>
                <Text style={[styles.footerText, { color: colors.text.secondary }]}> {t('and')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={[styles.footerLink, { color: colors.primary }]}>{t('privacyPolicy')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        <CustomModal
          visible={modalVisible}
          title={modalTitle}
          message={modalMessage}
          onConfirm={() => {
            setModalVisible(false);
            if (modalOnConfirmRef.current) {
              modalOnConfirmRef.current();
            }
          }}
          onCancel={() => setModalVisible(false)}
          onlyConfirm={modalOnlyConfirm}
        />

      {/* Language Selection Modal */}
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
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {t('selectLanguage') || 'Select Language'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
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
                    language === lang.code && [
                      styles.languageItemSelected,
                      {
                        borderColor: colors.primary,
                        backgroundColor: isDarkMode ? colors.card : '#E6F7FF',
                      }
                    ]
                  ]}
                  onPress={() => {
                    changeLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.languageFlag, { color: colors.text.primary }]}>
                    {lang.flag}
                  </Text>
                  <Text style={[
                    styles.languageName,
                    { color: colors.text.primary },
                    language === lang.code && styles.languageNameSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons
                      name="checkmark-outline"
                      size={20}
                      color={colors.primary}
                      style={styles.checkmarkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
       </View>
     </KeyboardAvoidingView>
   );
 };

 const styles = StyleSheet.create({
   gradientBg: {
     flex: 1,
     position: 'relative',
   },
   scrollContent: {
     flexGrow: 1,
     justifyContent: 'center',
     padding: 24,
     minHeight: '100%',
   },
   header: {
     alignItems: 'center',
     marginBottom: 32,
     zIndex: 2,
   },
   logoImageModern: {
     width: 80,
     height: 80,
     marginBottom: 10,
     borderRadius: 24,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.10,
     shadowRadius: 8,
     elevation: 4,
   },
   logoText: {
     fontSize: 32,
     fontWeight: 'bold',
     marginBottom: 2,
     letterSpacing: 1.2,
     fontFamily: 'Poppins-Bold',
   },
   tagline: {
     fontSize: 15,
     fontWeight: '500',
     marginBottom: 2,
     fontFamily: 'Poppins-Regular',
   },
   formCard: {
     borderRadius: 24,
     padding: 24,
     marginHorizontal: 0,
     marginBottom: 32,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.05,
     shadowRadius: 20,
     elevation: 8,
     zIndex: 2,
   },
   title: {
     fontSize: 22,
     fontWeight: 'bold',
     marginBottom: 6,
     textAlign: 'center',
     fontFamily: 'Poppins-Bold',
   },
   subtitle: {
     fontSize: 15,
     marginBottom: 18,
     textAlign: 'center',
     fontFamily: 'Poppins-Regular',
   },
   tabs: {
     flexDirection: 'row',
     borderRadius: 12,
     marginBottom: 18,
     overflow: 'hidden',
   },
   tab: {
     flex: 1,
     paddingVertical: 10,
     alignItems: 'center',
     borderRadius: 12,
   },
   tabText: {
     fontSize: 15,
     fontWeight: '600',
     fontFamily: 'Poppins-Regular',
   },
   inputContainer: {
     marginBottom: 8,
   },
   inputRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 12,
   },
   countryPicker: {
     marginRight: 4,
   },
   countryCodeText: {
     fontSize: 15,
     fontWeight: '600',
     marginRight: 8,
   },
   input: {
     borderWidth: 1,
     borderRadius: 12,
     padding: 14,
     fontSize: 16,
     marginBottom: 12,
     fontFamily: 'Poppins-Regular',
   },
   button: {
     paddingVertical: 14,
     borderRadius: 12,
     alignItems: 'center',
     marginTop: 2,
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.18,
     shadowRadius: 12,
     elevation: 4,
   },
   buttonDisabled: {
     opacity: 0.6,
   },
   buttonText: {
     color: '#fff',
     fontSize: 16,
     fontWeight: '600',
     letterSpacing: 0.5,
     fontFamily: 'Poppins-Regular',
   },
   resendContainer: {
     flexDirection: 'row',
     justifyContent: 'center',
     marginTop: 8,
   },
   resendText: {
     fontSize: 14,
     fontFamily: 'Poppins-Regular',
   },
   resendLink: {
     fontSize: 14,
     fontWeight: '600',
     fontFamily: 'Poppins-Regular',
   },
   changeButton: {
     marginTop: 8,
     alignItems: 'center',
   },
   changeButtonText: {
     fontSize: 14,
     fontWeight: '600',
     fontFamily: 'Poppins-Regular',
   },
   infoBanner: {
     borderColor: '#FFECB3',
     borderWidth: 1,
     borderRadius: 10,
     padding: 12,
     marginTop: 16,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   infoText: {
     fontSize: 14,
     flex: 1,
     fontFamily: 'Poppins-Regular',
   },
   infoClose: {
     marginLeft: 12,
     padding: 2,
   },
   footerWrap: {
     marginTop: 32,
     alignItems: 'center',
   },
   divider: {
     height: 1,
     width: '100%',
     marginBottom: 18,
   },
   footer: {
     alignItems: 'center',
     flexDirection: 'row',
     flexWrap: 'wrap',
     justifyContent: 'center',
   },
   footerText: {
     fontSize: 13,
     fontFamily: 'Poppins-Regular',
   },
   footerLinks: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   footerLink: {
     fontSize: 13,
     fontWeight: '600',
     fontFamily: 'Poppins-Regular',
   },
   // Language Button
   languageButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 14,
     paddingHorizontal: 20,
     borderRadius: 12,
     borderWidth: 1,
     alignSelf: 'center',
     marginBottom: 24,
     gap: 8,
   },
   languageButtonText: {
     fontSize: 14,
     fontFamily: 'Poppins-Regular',
     marginLeft: 8,
     marginRight: 4,
   },

   // Language Modal
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
   },
   languageModal: {
     width: '100%',
     maxWidth: 400,
     borderRadius: 20,
     overflow: 'hidden',
   },
   modalHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingHorizontal: 20,
     paddingVertical: 18,
     borderBottomWidth: 1,
   },
   modalTitle: {
     fontSize: 18,
     fontWeight: '600',
     fontFamily: 'Poppins-SemiBold',
   },
   closeButton: {
     width: 36,
     height: 36,
     borderRadius: 18,
     justifyContent: 'center',
     alignItems: 'center',
   },
   languageList: {
     paddingHorizontal: 20,
     paddingVertical: 16,
   },
   languageItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 16,
     paddingHorizontal: 16,
     borderRadius: 14,
     marginBottom: 10,
   },
   languageItemSelected: {
     borderWidth: 2,
   },
   languageFlag: {
     fontSize: 28,
     marginRight: 16,
   },
   languageName: {
     fontSize: 16,
     fontFamily: 'Poppins-Regular',
     flex: 1,
   },
   languageNameSelected: {
     fontWeight: '700',
   },
   checkmarkIcon: {
     marginLeft: 8,
   },
 });

 export default LoginScreen;
