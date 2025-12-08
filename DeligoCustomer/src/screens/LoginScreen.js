import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { sendOTP, verifyOTP, saveUserData } from "../utils/auth";
import CountryPicker from "react-native-country-picker-modal";
import CustomModal from "../components/CustomModal";
import OTPInput from "../components/OTPInput";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { setAccessToken } from "../utils/storage";

const LOGO = require("../assets/images/logo.png"); // Transparent logo icon

const LoginScreen = ({ onLoginSuccess, navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const BRAND_PINK = colors.primary;
  const GRAY = colors.text.secondary;
  const INFO_BG = colors.surface;
  const [loginMethod, setLoginMethod] = useState("mobile");
  const [identifier, setIdentifier] = useState("");

  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [countryCode, setCountryCode] = useState("PT"); // Default Portugal

  const [country, setCountry] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
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

  const handleSendOtp = async (method) => {
    const value = identifier.trim();

    if (!value) {
      showModal(
        t("error"),
        `${t("pleaseEnter")} ${
          loginMethod === "mobile" ? t("mobileNumber") : t("emailAddress")
        }`
      );
      return;
    }

    if (loginMethod === "mobile") {
      const mobileRegex = /^\d{10,}$/;
      if (!mobileRegex.test(value)) {
        showModal(t("error"), t("validMobileNumber"));
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        showModal(t("error"), t("validEmailAddress"));
        return;
      }
    }
    setIsLoading(true);
    const code = country?.callingCode?.[0] || "";
    let emailPhone = method === "email" ? identifier : `+${code}${identifier}`;

    try {
      // Call sendOTP and log the server response for debugging
      // console.log("object", emailPhone, loginMethod);
      const sendRes = await sendOTP(emailPhone, loginMethod);

      // If API responded with success flag, proceed to OTP screen/modal
      if (sendRes && (sendRes.success === true || sendRes.success === "true")) {
        setIsOtpSent(true);
        showModal(
          t("otpSent"),
          // prefer server message if provided otherwise fallback to generic
          sendRes.message || t("checkOTP"),
          () => setModalVisible(false)
        );
      } else {
        // API returned but indicates failure - show message from server if present
        const msg =
          sendRes && (sendRes.message || sendRes.error || sendRes.msg)
            ? sendRes.message || sendRes.error || sendRes.msg
            : t("accountNotRegistered");
        console.warn("[LoginScreen] sendOTP reported failure:", sendRes);
        // Provide an action: navigate to HelpCenter so user can contact support or get help
        showModal(
          t("notRegistered"),
          msg,
          () => navigation.navigate("HelpCenter"),
          false
        );
      }
    } catch (error) {
      // error may be a rejected API response (response.data) or a network error
      console.error("[LoginScreen] sendOTP error:", error);

      // Try to extract server-provided message
      const serverMsg =
        error &&
        (error.message ||
          error.msg ||
          error.error ||
          error.message?.toString());

      if (serverMsg) {
        showModal(
          t("notRegistered"),
          serverMsg.toString(),
          () => navigation.navigate("HelpCenter"),
          false
        );
      } else if (error && error.status === 404) {
        showModal(
          t("notRegistered"),
          t("accountNotRegistered"),
          () => navigation.navigate("HelpCenter"),
          false
        );
      } else {
        // Generic fallback
        showModal(t("error"), t("somethingWentWrong"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (method) => {
    if (!otp.trim()) {
      showModal(t("error"), t("enterOTP"));
      return;
    }
    if (otp.length < 4) {
      showModal(t("error"), t("invalidOTP"));
      return;
    }
    setIsLoading(true);
    const code = country?.callingCode?.[0] || "";
    const emailPhone =
      method?.toLowerCase() === "email" ? identifier : `+${code}${identifier}`;

    try {
      const response = await verifyOTP(emailPhone, otp, loginMethod);

      const accessToken = response?.accessToken;
      const userData = response?.user || null;

      // If backend didn't return token, treat as failure
      if (!accessToken) {
        showModal(t("error"), t("invalidOTP"));
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
      showModal(t("error"), t("invalidOTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    showModal(t("otpResent"), t("newOtpSent"));
  };

  const handleChangeMethod = () => {
    setIdentifier("");
    setOtp("");
    setIsOtpSent(false);
    setLoginMethod(loginMethod === "mobile" ? "email" : "mobile");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Soft gradient background */}
      <View style={[styles.gradientBg, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            {/* Modern logo image, no border or card */}
            <Image
              source={LOGO}
              style={styles.logoImageModern}
              resizeMode="contain"
            />
            <Text style={[styles.logoText, { color: colors.text.primary }]}>
              {t("deligo")}
            </Text>
            <Text style={[styles.tagline, { color: colors.text.secondary }]}>
              {t("tagline")}
            </Text>
          </View>

          {/* Main Card with animation */}
          <Animated.View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {isOtpSent ? t("verifyOTP") : t("loginOrSignup")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {isOtpSent ? t("enterCodeSent") : t("enterToContinue")}
            </Text>

            {/* Tabs */}
            {!isOtpSent && (
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    { backgroundColor: colors.background },
                    loginMethod === "mobile" && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    loginMethod !== "mobile" && handleChangeMethod()
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.text.secondary },
                      loginMethod === "mobile" && { color: "#FFFFFF" },
                    ]}
                  >
                    {t("mobile")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    { backgroundColor: colors.background },
                    loginMethod === "email" && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    loginMethod !== "email" && handleChangeMethod()
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.text.secondary },
                      loginMethod === "email" && { color: "#FFFFFF" },
                    ]}
                  >
                    {t("email")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input Fields */}
            {!isOtpSent ? (
              <View style={styles.inputContainer}>
                {loginMethod === "mobile" && (
                  <View style={styles.inputRow}>
                    <CountryPicker
                      countryCode={countryCode}
                      withFilter
                      withFlag
                      withCallingCode
                      onSelect={(country) => {
                        setCountryCode(country.cca2);
                        setCountry(country);
                      }}
                      containerButtonStyle={styles.countryPicker}
                    />
                    <Text
                      style={[
                        styles.countryCodeText,
                        { color: colors.text.primary },
                      ]}
                    >
                      +{country ? country.callingCode[0] : "351"}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          color: colors.text.primary,
                          borderColor: colors.border,
                          flex: 1,
                        },
                      ]}
                      placeholder={t("mobileNumber")}
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
                {loginMethod === "email" && (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        color: colors.text.primary,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={t("emailAddress")}
                    placeholderTextColor={GRAY}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor={BRAND_PINK}
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleSendOtp(loginMethod)}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? t("sending") : t("sendOTP")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <OTPInput
                  length={loginMethod === "email" ? 4 : 6}
                  value={otp}
                  onChangeText={setOtp}
                  disabled={isLoading}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleVerifyOtp(loginMethod)}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? t("verifying") : t("verifyOTPButton")}
                  </Text>
                </TouchableOpacity>
                <View style={styles.resendContainer}>
                  <Text
                    style={[
                      styles.resendText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {t("didntReceiveOTP")}{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSendOtp(handleResendOtp)}
                  >
                    <Text
                      style={[styles.resendLink, { color: colors.primary }]}
                    >
                      {t("resend")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setIsOtpSent(false)}
                >
                  <Text
                    style={[
                      styles.changeButtonText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {t("change")}{" "}
                    {loginMethod === "mobile" ? t("number") : t("email")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Collapsible Info Banner (optional) */}
            {showInfo && (
              <View style={[styles.infoBanner, { backgroundColor: INFO_BG }]}>
                <Text
                  style={[styles.infoText, { color: colors.text.secondary }]}
                >
                  Demo: Use any valid mobile or email and OTP 1234 for testing.
                </Text>
                <TouchableOpacity
                  style={styles.infoClose}
                  onPress={() => setShowInfo(false)}
                >
                  <Text style={{ color: BRAND_PINK, fontWeight: "bold" }}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <View style={styles.footer}>
              <Text
                style={[styles.footerText, { color: colors.text.secondary }]}
              >
                {t("byContinuing")}{" "}
              </Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("TermsOfService")}
                >
                  <Text style={[styles.footerLink, { color: colors.primary }]}>
                    {t("termsOfService")}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[styles.footerText, { color: colors.text.secondary }]}
                >
                  {" "}
                  {t("and")}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("PrivacyPolicy")}
                >
                  <Text style={[styles.footerLink, { color: colors.primary }]}>
                    {t("privacyPolicy")}
                  </Text>
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
    position: "relative",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    zIndex: 2,
  },
  logoImageModern: {
    width: 80,
    height: 80,
    marginBottom: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 2,
    letterSpacing: 1.2,
    fontFamily: "Poppins-Bold",
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
    fontFamily: "Poppins-Regular",
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 0,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
    fontFamily: "Poppins-Bold",
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 18,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 18,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Poppins-Regular",
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  countryPicker: {
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: "Poppins-Regular",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: "Poppins-Regular",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Regular",
  },
  changeButton: {
    marginTop: 8,
    alignItems: "center",
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Regular",
  },
  infoBanner: {
    borderColor: "#FFECB3",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    fontFamily: "Poppins-Regular",
  },
  infoClose: {
    marginLeft: 12,
    padding: 2,
  },
  footerWrap: {
    marginTop: 32,
    alignItems: "center",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 18,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Poppins-Regular",
  },
});

export default LoginScreen;
