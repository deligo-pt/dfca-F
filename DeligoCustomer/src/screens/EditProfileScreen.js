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
  Button,
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
import {
  useGetLoginUserQuery,
  useUpdateProfileMutation,
} from "../store/api-queries/profile";
import GlobalLoader from "../components/GlobalLoader";
import {
  resetProfileChanges,
  setOriginalProfile,
  updateField,
} from "../store/state-management/profileSlice";
import Avatar from "../components/Profile/FormAvatar";
import * as ImagePicker from "expo-image-picker";

const EditProfileScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  // Address object state: show and optionally edit address details
  const [address, setAddress] = useState(null);
  // const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Redux
  const dispatch = useAppDispatch();
  const contactNumber = useAppSelector((state) => state.contactInfo);
  // === profile ===
  const { data, isLoading, isFetching } = useGetLoginUserQuery({});
  const [updateProfile, { isLoading: isLoadingUpdate, isSuccess, error }] =
    useUpdateProfileMutation();

  const user = data?.data;
  console.log("user: ", user);

  const { edited, isProfileUpdated } = useAppSelector((state) => state.profile);

  const [isEditing, setIsEditing] = useState(false);

  // photo picker state
  const [edit, setEdited] = useState({
    profilePhoto: user?.profilePhoto,
  });
  console.log("user?.profilePhoto", edit.profilePhoto);

  const [isUpdateEnabled, setUpdateEnabled] = useState(false);

  // Load API data into Redux
  useEffect(() => {
    if (user) {
      dispatch(setOriginalProfile(user));
    }
  }, [user]);

  const handleSave = async () => {
    console.log("FINAL DATA TO UPDATE:", edited);
    setIsEditing(false);
    dispatch(resetProfileChanges());

    const profileData = {
      name: { firstName: "Nishk", lastName: "VKLLL" },
      contactNumber: "+8801712241050",
      address: {
        street: "Rua de São Bento 121",
        city: "Lisbon",
        state: "Lisbon",
        country: "Portugal",
        postalCode: "1200-820",
        latitude: 38.716173,
        longitude: -9.141589,
        geoAccuracy: 5,
      },
    };

    try {
      const result = await updateProfile({
        imageFile: edit.profilePhoto, // object from ImagePicker { uri, type, name }
        profileData,
      }).unwrap();

      if (result.data.success) {
        Alert.alert("Profile Update Successfully!!");
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  if (!edited) return null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log("Permission:", status);

    if (status !== "granted") {
      alert("Permission required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    console.log("Picker result:", result);

    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      setEdited((prev) => ({ ...prev, profilePhoto: newUri }));
      setIsEditing(true);
      console.log("New image URI:", newUri);
    }
  };

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

  /* const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert(t("success"), t("profileUpdated"));
    setIsEditing(false);
  }; */

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Avatar */}
        <Avatar
          uri={edit?.profilePhoto}
          isEditing={isEditing}
          colors={colors}
          onChangePhoto={() => {
            pickImage();
          }}
        />

        {/* FIRST NAME */}
        <FormInput
          label="First Name"
          value={edited.name?.firstName}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "name",
                value: { ...edited.name, firstName: text },
              })
            )
          }
          placeholder="Enter first name"
          iconName="person-outline"
          disabled={!isEditing}
        />

        {/* LAST NAME */}
        <FormInput
          label="Last Name"
          value={edited.name?.lastName}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "name",
                value: { ...edited.name, lastName: text },
              })
            )
          }
          placeholder="Enter last name"
          iconName="person-circle-outline"
          disabled={!isEditing}
        />

        {/* EMAIL */}
        <FormInput
          label="Email"
          value={edited.email}
          onChangeText={(text) =>
            dispatch(updateField({ key: "email", value: text }))
          }
          placeholder="Enter email"
          iconName="mail-outline"
          disabled={!isEditing}
        />

        {/* PHONE */}
        <FormInput
          label="Phone Number"
          value={edited.contactNumber}
          onChangeText={(text) =>
            dispatch(updateField({ key: "contactNumber", value: text }))
          }
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          iconName="call-outline"
          disabled={!isEditing}
        />

        {/* STREET */}
        <FormInput
          label="Street"
          value={edited.address?.street}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "address",
                value: { ...edited.address, street: text },
              })
            )
          }
          placeholder="Street"
          iconName="home-outline"
          disabled={!isEditing}
        />

        {/* CITY */}
        <FormInput
          label="City"
          value={edited.address?.city}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "address",
                value: { ...edited.address, city: text },
              })
            )
          }
          placeholder="City"
          iconName="business-outline"
          disabled={!isEditing}
        />

        {/* STATE */}
        <FormInput
          label="State"
          value={edited.address?.state}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "address",
                value: { ...edited.address, state: text },
              })
            )
          }
          placeholder="State"
          iconName="location-outline"
          disabled={!isEditing}
        />

        {/* BUTTONS */}
        <View style={{ height: 20 }} />

        {/* EDIT or SAVE */}
        {!isEditing ? (
          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: colors.primary,
              borderRadius: 10,
            }}
            onPress={() => setIsEditing(true)}
          >
            <Text
              style={{
                color: colors.text.white,
                textAlign: "center",
                fontSize: 16,
              }}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            disabled={!isProfileUpdated}
            style={{
              padding: 15,
              borderRadius: 10,
              backgroundColor: isProfileUpdated ? colors.primary : "#999",
            }}
            onPress={handleSave}
          >
            {isLoadingUpdate ? (
              <Text
                style={{ color: "#fff", textAlign: "center", fontSize: 16 }}
              >
                Updating...
              </Text>
            ) : (
              <Text
                style={{ color: "#fff", textAlign: "center", fontSize: 16 }}
              >
                Save Changes
              </Text>
            )}
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
