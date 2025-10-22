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
} from 'react-native';
import { sendOTP, verifyOTP, saveUserData } from '../utils/auth';
import CountryPicker from 'react-native-country-picker-modal';
import CustomModal from '../components/CustomModal';
import OTPInput from '../components/OTPInput';

const LOGO = require('../assets/images/logo.png'); // Transparent logo icon

const BRAND_PINK = '#E91E63';
const GRAY = '#757575';
const BORDER = '#E0E0E0';
const INFO_BG = '#FFF8E1';

const LoginScreen = ({ onLoginSuccess, navigation }) => {
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
      showModal('Error', `Please enter your ${loginMethod === 'mobile' ? 'mobile number' : 'email address'}`);
      return;
    }
    if (loginMethod === 'mobile') {
      if (identifier.length < 10) {
        showModal('Error', 'Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      if (!identifier.includes('@')) {
        showModal('Error', 'Please enter a valid email address');
        return;
      }
    }
    setIsLoading(true);
    try {
      await sendOTP(identifier, loginMethod);
      setIsOtpSent(true);
      showModal(
        'OTP Sent',
        `Check your ${loginMethod === 'mobile' ? 'mobile number' : 'email'} for the OTP we just sent.`,
        () => setModalVisible(false)
      );
    } catch (error) {
      showModal('Not Registered', 'This account is not registered.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showModal('Error', 'Please enter the OTP');
      return;
    }
    if (otp.length !== 4) {
      showModal('Error', 'Please enter a valid 4-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const response = await verifyOTP(identifier, otp, loginMethod);
      // Don't save user data yet - wait for user to click OK on modal
      const userData = response.user;
      setModalTitle('Success');
      setModalMessage(`Welcome back, ${userData.name}!`);
      setModalOnlyConfirm(true);
      // Store the callback in ref instead of state
      modalOnConfirmRef.current = () => {
        console.log('Modal OK pressed, saving user data and navigating to home');
        // Save user data and navigate only after OK is clicked
        setTimeout(async () => {
          await saveUserData(userData);
          if (onLoginSuccess) {
            console.log('Calling onLoginSuccess with user data:', userData);
            onLoginSuccess(userData);
          }
        }, 0);
      };
      setModalVisible(true);
    } catch (error) {
      showModal('Error', 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp('');
    showModal('OTP Resent', `A new verification code has been sent to your ${loginMethod === 'mobile' ? 'mobile number' : 'email'}.`);
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
      <View style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            {/* Modern logo image, no border or card */}
            <Image source={LOGO} style={styles.logoImageModern} resizeMode="contain" />
            <Text style={styles.logoText}>Deligo</Text>
            <Text style={styles.tagline}>Food delivery at your doorstep.</Text>
          </View>

          {/* Main Card with animation */}
          <Animated.View style={[styles.formCard, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
            <Text style={styles.title}>{isOtpSent ? 'Verify OTP' : 'Login or Sign up'}</Text>
            <Text style={styles.subtitle}>{isOtpSent ? `Enter the code sent to your ${loginMethod === 'mobile' ? 'mobile number' : 'email'}` : `Enter your ${loginMethod === 'mobile' ? 'mobile number' : 'email address'} to continue`}</Text>

            {/* Tabs */}
            {!isOtpSent && (
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, loginMethod === 'mobile' && styles.tabActive]}
                  onPress={() => loginMethod !== 'mobile' && handleChangeMethod()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, loginMethod === 'mobile' && styles.tabTextActive]}>Mobile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
                  onPress={() => loginMethod !== 'email' && handleChangeMethod()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>Email</Text>
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
                    <Text style={styles.countryCodeText}>+{country ? country.callingCode[0] : '351'}</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Mobile number"
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
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={GRAY}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor={BRAND_PINK}
                  />
                )}
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Send OTP'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <OTPInput
                  length={4}
                  value={otp}
                  onChangeText={setOtp}
                  disabled={isLoading}
                />
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify OTP'}</Text>
                </TouchableOpacity>
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive OTP? </Text>
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.changeButton} onPress={() => setIsOtpSent(false)}>
                  <Text style={styles.changeButtonText}>Change {loginMethod === 'mobile' ? 'Number' : 'Email'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Collapsible Info Banner (optional) */}
            {showInfo && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>Demo: Use any valid mobile or email and OTP 1234 for testing.</Text>
                <TouchableOpacity style={styles.infoClose} onPress={() => setShowInfo(false)}>
                  <Text style={{ color: BRAND_PINK, fontWeight: 'bold' }}>×</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <View style={styles.divider} />
            <View style={styles.footer}>
              <Text style={styles.footerText}>By continuing, you agree to our </Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={styles.footerLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}> and </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
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
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
    backgroundColor: '#FFF5F7',
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
    // No border, no background, just a clean modern logo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BRAND_PINK,
    marginBottom: 2,
    letterSpacing: 1.2,
    fontFamily: 'Poppins-Bold', // Use Poppins or Inter if available
  },
  tagline: {
    fontSize: 15,
    color: GRAY,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  formCard: {
    backgroundColor: '#fff',
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
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 15,
    color: GRAY,
    marginBottom: 18,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
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
  tabActive: {
    backgroundColor: '#FCE4EC',
  },
  tabText: {
    fontSize: 15,
    color: GRAY,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  tabTextActive: {
    color: BRAND_PINK,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
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
    color: '#222',
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
    fontFamily: 'Poppins-Regular',
  },
  button: {
    backgroundColor: BRAND_PINK,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 2,
    shadowColor: BRAND_PINK,
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
    color: GRAY,
    fontFamily: 'Poppins-Regular',
  },
  resendLink: {
    fontSize: 14,
    color: BRAND_PINK,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  changeButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 14,
    color: BRAND_PINK,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  infoBanner: {
    backgroundColor: INFO_BG,
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
    color: '#8D6E63',
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
    backgroundColor: '#F0F0F0',
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
    color: GRAY,
    fontFamily: 'Poppins-Regular',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: BRAND_PINK,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
});

export default LoginScreen;

