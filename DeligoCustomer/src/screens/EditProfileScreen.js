import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { getUserData } from "../utils/auth";
import { useLanguage } from "../utils/LanguageContext";
import { LocationDetails } from "../components/Profile";
import { useAppDispatch, useAppSelector } from "../store/store";
import FormInput from "../components/Profile/FormInput";
import { setContact } from "../store/state-management/map";
import { useGetLoginUserQuery } from "../store/api-queries/profile";
import GlobalLoader from "../components/GlobalLoader";

const EditProfileScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  // Address object state: show and optionally edit address details
  const [address, setAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Redux
  const dispatch = useAppDispatch();
  const contactNumber = useAppSelector((state) => state.contactInfo);
  // === profile ===
  const { data, isLoading, isFetching } = useGetLoginUserQuery({});

  const user = data?.data;
  console.log("user: ", user);

  // sensible default address (from user's request)
  const defaultAddress = {
    city: "Dhaka",
    country: "Bangladesh",
    geoAccuracy: 5,
    latitude: 23.7808875,
    longitude: 90.4165875,
    postalCode: "1212",
    state: "Badda",
    street: "House 32, Road 14",
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Prefer route param if available (when navigating from profile card)
      const routeUser = route?.params?.user;
      if (routeUser) {
        // derive name safely from possible shapes
        const derivedName = `${
          routeUser.name?.firstName ||
          routeUser.firstName ||
          routeUser.name ||
          routeUser.fullName ||
          ""
        } ${routeUser.name?.lastName || routeUser.lastName || ""}`.trim();
        setName(derivedName || routeUser.displayName || "");
        setEmail(routeUser.email || routeUser.contactEmail || "");
        setMobile(
          routeUser.contactNumber || routeUser.phone || routeUser.mobile || ""
        );
        setProfilePhoto(
          routeUser.profilePhoto ||
            routeUser.photo ||
            routeUser.avatar ||
            routeUser.photoUrl ||
            routeUser.avatarUrl ||
            null
        );
        // set address if present on route user, otherwise use provided default
        setAddress(routeUser.address || routeUser.location || defaultAddress);
        return;
      }

      const userData = await getUserData();
      setName(userData?.name || "");
      setEmail(userData?.email || "");
      setMobile(userData?.mobile || "");
      setProfilePhoto(
        userData?.profilePhoto ||
          userData?.photo ||
          userData?.avatarUrl ||
          userData?.avatar ||
          null
      );
      // prefer explicit address property, fall back to defaultAddress
      setAddress(userData?.address || userData?.location || defaultAddress);
    } catch (err) {
      console.warn("[EditProfileScreen] loadUserData error", err);
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert(t("success"), t("profileUpdated"));
    setIsEditing(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {(isLoading || isFetching) && <GlobalLoader visible={isLoading} />}
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              width: 80,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerText,
            {
              color: colors.text.primary,
            },
          ]}
        >
          {t("editProfile")}
        </Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}
        >
          <Text style={[styles.editButtonText, { color: colors.primary }]}>
            {isEditing ? t("cancel") : t("edit")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View
          style={[styles.avatarSection, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text.white }]}>
                {name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity
              style={[
                styles.changePhotoButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>
                {t("changePhoto")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View
          style={[styles.formSection, { backgroundColor: colors.background }]}
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {t("fullName")}
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isEditing && {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.text.secondary}
              />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={name}
                onChangeText={setName}
                placeholder={t("enterYourName")}
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {t("emailAddress")}
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isEditing && {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.text.secondary}
              />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={email}
                onChangeText={setEmail}
                placeholder={t("enterYourEmail")}
                keyboardType="email-address"
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          {/* reusable user form */}
          <FormInput
            label="Mobile number"
            value={user?.contactNumber}
            onChangeText={(text) => dispatch(setContact(text))}
            placeholder={t("enterYourMobileNumber")}
            keyboardType="phone-pad"
            iconName="call-outline"
            disabled={isEditing ? false : true}
          />

          {/* ---------- NAME FIELDS ---------- */}
          <FormInput
            label="First Name"
            value={user?.name?.firstName}
            onChangeText={() => {}}
            placeholder="Enter first name"
            iconName="person-outline"
            disabled={isEditing ? false : true}
          />

          <FormInput
            label="Last Name"
            value={user?.name?.lastName}
            onChangeText={() => {}}
            placeholder="Enter last name"
            iconName="person-circle-outline"
            disabled={isEditing ? false : true}
          />

          {/* ---------- EMAIL ---------- */}
          <FormInput
            label="Email"
            value={user?.email}
            onChangeText={() => {}}
            placeholder="Enter email"
            keyboardType="email-address"
            iconName="mail-outline"
            disabled={isEditing ? false : true}
          />

          {/* ---------- PHONE ---------- */}
          <FormInput
            label="Mobile Number"
            value={user?.contactNumber}
            onChangeText={() => {}}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            iconName="call-outline"
            disabled={isEditing ? false : true}
          />

          {/* ---------- ADDRESS FIELDS ---------- */}
          <FormInput
            label="Street"
            value={user?.address?.street}
            onChangeText={() => {}}
            placeholder="Street address"
            iconName="home-outline"
            disabled={isEditing ? false : true}
          />

          <FormInput
            label="City"
            value={user?.address?.city}
            onChangeText={() => {}}
            placeholder="City"
            iconName="business-outline"
            disabled={isEditing ? false : true}
          />

          <FormInput
            label="State"
            value={user?.address?.state}
            onChangeText={() => {}}
            placeholder="State"
            iconName="location-outline"
            disabled={isEditing ? false : true}
          />

          {/* Location details component */}
          {isEditing && <LocationDetails />}
          {/* all values */}
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.saveButtonText, { color: colors.text.white }]}>
              {t("saveChanges")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    minWidth: 88, // allow longer localized labels like "Cancelar"
    paddingHorizontal: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    includeFontPadding: false,
    textAlign: "right",
  },
  content: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: "bold",
    fontFamily: "Poppins-Bold",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    // backgroundColor set via theme in JSX
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginLeft: 6,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor set via theme in JSX
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    // borderColor set via theme in JSX
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    marginLeft: 12,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
});

export default EditProfileScreen;
