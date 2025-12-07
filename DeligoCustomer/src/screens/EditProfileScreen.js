import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { useAppDispatch, useAppSelector } from "../store/store";
import FormInput from "../components/Profile/FormInput";
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

  // Redux
  const dispatch = useAppDispatch();
  // === profile ===
  const { data, isLoading, isFetching, refetch } = useGetLoginUserQuery({});
  const [updateProfile, { isLoading: isLoadingUpdate, isSuccess, error }] =
    useUpdateProfileMutation();

  const user = data?.data;
  const userId = user?.userId;
  console.log("user: ", user);

  const { edited, isProfileUpdated } = useAppSelector((state) => state.profile);

  const [isEditing, setIsEditing] = useState(false);
  const profilePhoto = useAppSelector(
    (state) => state.profile.edited.profilePhoto
  );

  // Load API data into Redux
  useEffect(() => {
    if (user) {
      dispatch(setOriginalProfile(user));
    }
  }, [user]);

  const handleSave = async () => {
    if (!edited || !user) return;

    try {
      // Prepare a copy of edited to send
      const profileData = { ...edited };

      // Prepare imageFile if profile photo changed
      let imageFile = null;
      if (edited.profilePhoto && edited.profilePhoto !== user?.profilePhoto) {
        const uriParts = edited.profilePhoto.split("/");
        const fileName = uriParts[uriParts.length - 1];
        const fileType = `image/${fileName.split(".").pop()}`;

        imageFile = {
          uri: edited.profilePhoto,
          name: fileName,
          type: fileType,
        };

        // Remove from profileData since it's sent as file
        delete profileData.profilePhoto;
      }

      // Merge nested objects (like address) with original to preserve unchanged fields
      if (edited.address) {
        profileData.address = {
          ...user.address,
          ...edited.address,
        };
      }

      // Detect if anything actually changed
      const changesExist =
        JSON.stringify(user) !== JSON.stringify({ ...user, ...profileData });

      if (!changesExist) {
        console.log("No changes detected");
        Alert.alert("No changes detected");
        return;
      }

      // Call the API
      const result = await updateProfile({
        customerId: userId,
        imageFile,
        profileData,
      }).unwrap();

      if (result.success || result.data?.success) {
        Alert.alert("Profile updated successfully!");
        dispatch(resetProfileChanges());
        setIsEditing(false);
        refetch(); // refresh user data
      }
    } catch (err) {
      console.error("Update failed:", err);
      Alert.alert("Update failed!", "Please try again.");
    }
  };

  if (!edited) return null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

    if (!result.canceled) {
      const newUri = result.assets[0].uri;

      // Update Redux slice edited state
      dispatch(updateField({ key: "profilePhoto", value: newUri }));

      console.log("New image URI:", newUri);
    }
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
          onPress={() => {
            if (isEditing) {
              dispatch(resetProfileChanges());
            }
            setIsEditing(!isEditing);
          }}
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
          uri={user?.profilePhoto || profilePhoto}
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
          disabled={true}
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
          disabled={true}
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

        {/* POSTAL CODE */}
        <FormInput
          label="postalCode"
          value={edited.address?.postalCode}
          onChangeText={(text) =>
            dispatch(
              updateField({
                key: "address",
                value: { ...edited.address, postalCode: text },
              })
            )
          }
          placeholder="postalCode"
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
            <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
              {isLoadingUpdate ? "Updating..." : "Save Changes"}
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
