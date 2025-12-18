import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { getUserData, saveUserData, getUserId } from '../utils/auth';
import { useLanguage } from '../utils/LanguageContext';
import LocationDetails from '../components/Profile/LocationDetails';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { customerApi } from '../utils/api';
import CustomModal from '../components/CustomModal';
import * as ImagePicker from 'expo-image-picker';
import ImageEditor from '../components/ImageEditor';

import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from '../contexts/LocationContext';

const EditProfileScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      flex: 1,
      textAlign: 'center',
      color: colors.text.primary,
    },
    editButton: {
      minWidth: 88,
      paddingHorizontal: 12,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    editButtonText: {
      fontSize: 16,
      fontFamily: 'Poppins-Medium',
      includeFontPadding: false,
      textAlign: 'right',
      color: colors.primary,
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
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarText: {
      fontSize: 42,
      fontWeight: 'bold',
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    changePhotoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    changePhotoText: {
      fontSize: 14,
      fontFamily: 'Poppins-Medium',
      marginLeft: 6,
      color: colors.primary,
    },
    formSection: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      marginTop: 12,
      backgroundColor: colors.background,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 8,
      color: colors.text.primary,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Poppins-Regular',
      marginLeft: 12,
      color: colors.text.primary,
    },
    saveButton: {
      marginHorizontal: 20,
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.white,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    imagePickerContainer: {
      width: '100%',
      padding: 20,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.background,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    imagePickerHeader: {
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    imagePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
    },
    imagePickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },
    imagePickerText: {
      fontSize: 16,
      fontFamily: 'Poppins-Medium',
      marginLeft: 12,
      color: colors.text.primary,
    },
    separator: {
      height: 1,
      width: '100%',
      marginVertical: 8,
      backgroundColor: colors.border,
    },
  }), [colors]);
  // Use updateProfile from context to ensure global state stays in sync
  const { updateProfile: updateProfileContext } = useProfile();
  const { saveAddress } = useLocation();

  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [userData, setUserDataState] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', onConfirm: null, onlyConfirm: false });
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imageEditorVisible, setImageEditorVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const defaultAddress = {
    city: 'Dhaka',
    country: 'Bangladesh',
    geoAccuracy: 5,
    latitude: 23.7808875,
    longitude: 90.4165875,
    postalCode: '1212',
    state: 'Badda',
    street: 'House 32, Road 14',
  };

  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: defaultAddress.latitude,
    longitude: defaultAddress.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: defaultAddress.latitude,
    longitude: defaultAddress.longitude,
  });
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [streetAddress, setStreetAddress] = useState(defaultAddress.street);
  const [city, setCity] = useState(defaultAddress.city);
  const [postalCode, setPostalCode] = useState(defaultAddress.postalCode);

  const [label, setLabel] = useState('Home');
  const [fieldErrors, setFieldErrors] = useState({});

  const constructAddressFromFields = () => {
    const newAddress = {
      street: streetAddress || '',
      city: city || '',
      state: defaultAddress.state,
      country: defaultAddress.country,
      postalCode: postalCode || '',
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,

      geoAccuracy: 5,
      label: label,
    };
    setAddress(newAddress);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const routeUser = route?.params?.user;

      if (routeUser) {
        setUserDataState(routeUser);

        let fname = '';
        let lname = '';
        if (routeUser.name?.firstName) {
          fname = routeUser.name.firstName;
          lname = routeUser.name.lastName || '';
        } else if (routeUser.firstName) {
          fname = routeUser.firstName;
          lname = routeUser.lastName || '';
        } else if (routeUser.name && typeof routeUser.name === 'string') {
          const parts = routeUser.name.trim().split(' ');
          fname = parts[0] || '';
          lname = parts.slice(1).join(' ') || '';
        } else if (routeUser.fullName) {
          const parts = routeUser.fullName.trim().split(' ');
          fname = parts[0] || '';
          lname = parts.slice(1).join(' ') || '';
        }
        setFirstName(fname);
        setLastName(lname);
        setEmail(routeUser.email || routeUser.contactEmail || '');
        setMobile(routeUser.contactNumber || routeUser.phone || routeUser.mobile || '');
        setProfilePhoto(routeUser.profilePhoto || routeUser.photo || routeUser.avatar || routeUser.photoUrl || routeUser.avatarUrl || null);

        const addr = routeUser.address || routeUser.location || defaultAddress;
        setAddress(addr);

        setMapRegion({
          latitude: addr.latitude || defaultAddress.latitude,
          longitude: addr.longitude || defaultAddress.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setMarkerCoordinate({
          latitude: addr.latitude || defaultAddress.latitude,
          longitude: addr.longitude || defaultAddress.longitude,
        });
        setStreetAddress(addr.street || defaultAddress.street);
        setCity(addr.city || defaultAddress.city);

        setPostalCode(addr.postalCode || defaultAddress.postalCode);
        setLabel(addr.label || 'Home');
        return;
      }

      const localUserData = await getUserData();
      setUserDataState(localUserData);
      setFirstName(localUserData?.name?.firstName || '');
      setLastName(localUserData?.name?.lastName || '');
      setEmail(localUserData?.email || '');
      setMobile(localUserData?.contactNumber || '');
      setProfilePhoto(localUserData?.profilePhoto || localUserData?.photo || localUserData?.avatarUrl || localUserData?.avatar || null);

      const addr = localUserData?.address || localUserData?.location || defaultAddress;
      setAddress(addr);

      setMapRegion({
        latitude: addr.latitude || defaultAddress.latitude,
        longitude: addr.longitude || defaultAddress.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarkerCoordinate({
        latitude: addr.latitude || defaultAddress.latitude,
        longitude: addr.longitude || defaultAddress.longitude,
      });
      setStreetAddress(addr.street || defaultAddress.street);
      setCity(addr.city || defaultAddress.city);

      setPostalCode(addr.postalCode || defaultAddress.postalCode);
      setLabel(addr.label || 'Home');
    } catch (err) {
      console.warn('[EditProfileScreen] loadUserData error', err);
    }
  };

  const showModal = (title, message, onConfirm = null, onlyConfirm = false) => {
    setModalConfig({ title, message, onConfirm, onlyConfirm });
    setModalVisible(true);
  };

  const updateProfile = async (profileData, imageFile = null, userInfo = null) => {
    try {
      const customerId = await getUserId();

      if (!customerId) {
        console.error('No customer ID found from token');
        throw new Error('Customer ID not found. Please log in again.');
      }

      const formData = new FormData();


      const updatedProfileData = {
        name: { firstName, lastName },
        contactNumber: mobile,
        email: email,
        ...profileData,
      };

      formData.append('data', JSON.stringify(updatedProfileData));

      if (imageFile && imageFile.uri) {
        formData.append('file', {
          uri: imageFile.uri,
          type: imageFile.type || 'image/jpeg',
          name: imageFile.name || `profile-${Date.now()}.jpg`
        });
      }

      console.log('Updating profile for customer:', customerId);
      console.log('Profile data:', updatedProfileData);

      const response = await customerApi.patch(
        // `/customers/${customerId}`,
        `/customers/${customerId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log('Profile updated successfully');
      return response;

    } catch (error) {
      console.error('Profile update failed:', error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error;

        if (status === 401) {
          throw new Error('Session expired. Please log in again.');
        } else if (status === 404) {
          throw new Error('Customer profile not found.');
        } else if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(message || 'Failed to update profile');
        }
      } else if (error.request) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!firstName.trim()) {
        showModal(t('error'), t('enterFirstName'), null, true);
        return;
      }

      if (!mobile.trim()) {
        showModal(t('error'), t('enterMobileNumberError'), null, true);
        return;
      }

      if (!address) {
        showModal(t('error'), t('provideAddress'), null, true);
        return;
      }
      // Send the update to the server
      await updateProfile({ address }, profilePhoto, userData);

      // After a successful API call, manually update the local user data.
      // This is more reliable than depending on the API response body.
      const currentLocalUser = await getUserData();
      const updatedUser = {
        ...currentLocalUser,
        name: {
          firstName,
          lastName
        },
        contactNumber: mobile,
        email: email,
        address: address,
        profilePhoto: profilePhoto || currentLocalUser.profilePhoto,
      };

      // Save the merged user object back to storage AND update context
      await updateProfileContext(updatedUser);

      // Sync address to LocationContext (local storage) for checkout consistency
      if (address) {
        // Ensure lat/lng are present in correct structure
        const lat = markerCoordinate?.latitude || address.latitude;
        const lng = markerCoordinate?.longitude || address.longitude;

        await saveAddress({
          address: streetAddress,
          detailedAddress: city,
          city: city,
          postalCode: postalCode,
          label: label,
          coordinates: { latitude: lat, longitude: lng }
        });
      }

      // set local state to match
      setUserDataState(updatedUser);

      showModal(t('success'), t('profileUpdated'), () => {
        setModalVisible(false);
        setIsEditing(false);
        navigation.goBack();
      }, true);

    } catch (error) {
      console.error('Save failed:', error);
      showModal(t('error'), error.message || t('saveFailed'), null, true);
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showModal(t('locationPermissionDenied'), t('locationPermissionRequired'), null, true);
        setIsLoadingLocation(false);
        return;
      }
      setLocationPermission(true);
      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarkerCoordinate({ latitude, longitude });
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      showModal(t('error'), t('failedToGetLocation'), null, true);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchAddress = async () => {
    if (!searchLocation.trim()) return;

    setIsLoadingLocation(true);
    try {
      const googleMapsApiKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
        Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

      if (!googleMapsApiKey) {
        showModal(t('error'), t('googleMapsKeyMissing'), null, true);
        return;
      }

      const textSearchResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchLocation)}&key=${googleMapsApiKey}`
      );

      const textSearchData = await textSearchResponse.json();

      if (textSearchData.status === 'OK' && textSearchData.results && textSearchData.results.length > 0) {
        const place = textSearchData.results[0];
        const placeId = place.place_id;
        const { lat, lng } = place.geometry.location;

        const placeDetailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,geometry,name&key=${googleMapsApiKey}`
        );

        const placeDetailsData = await placeDetailsResponse.json();

        let detailedPlace = place;
        if (placeDetailsData.status === 'OK' && placeDetailsData.result) {
          detailedPlace = placeDetailsData.result;
        }

        setMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setMarkerCoordinate({ latitude: lat, longitude: lng });

        setStreetAddress(detailedPlace.formatted_address || detailedPlace.name || '');

        let cityComponent = null;
        let postalComponent = null;

        if (detailedPlace.address_components) {
          cityComponent = detailedPlace.address_components.find(component =>
            component.types.includes('locality') || component.types.includes('administrative_area_level_2')
          );
          postalComponent = detailedPlace.address_components.find(component =>
            component.types.includes('postal_code')
          );

          if (cityComponent) {
            setCity(cityComponent.long_name);
          }
          if (postalComponent) {
            setPostalCode(postalComponent.long_name);
          }
        }

        const updatedAddress = {
          street: detailedPlace.formatted_address || detailedPlace.name || '',
          city: cityComponent?.long_name || 'Dhaka',
          state: 'Badda',
          country: 'Bangladesh',
          postalCode: postalComponent?.long_name || '1212',
          latitude: lat,
          longitude: lng,

          geoAccuracy: 5,
          label: label,
        };

        setAddress(updatedAddress);
        setSearchLocation('');
      } else {
        showModal(t('error'), t('noPlacesFound'), null, true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      showModal(t('error'), t('addressSearchFailed'), null, true);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      let addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];

        setStreetAddress(addr.street || '');
        setCity(addr.city || '');
        setPostalCode(addr.postalCode || '');

        setAddress(prev => ({
          ...prev,
          street: addr.street || prev?.street || '',
          city: addr.city || prev?.city || '',
          state: addr.region || prev?.state || '',
          postalCode: addr.postalCode || prev?.postalCode || '',
          country: addr.country || prev?.country || '',
          latitude,
          longitude,
          geoAccuracy: 5,

          label: label,
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const setStreetAddressWithConstruct = (value) => {
    setStreetAddress(value);
    setTimeout(constructAddressFromFields, 0);
  };

  const setCityWithConstruct = (value) => {
    setCity(value);
    setTimeout(constructAddressFromFields, 0);
  };

  const setPostalCodeWithConstruct = (value) => {
    setPostalCode(value);
    setTimeout(constructAddressFromFields, 0);
  };

  const setMarkerCoordinateWithConstruct = (coordinate) => {
    setMarkerCoordinate(coordinate);
    setTimeout(constructAddressFromFields, 0);
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showModal(t('cameraPermissionDenied'), t('cameraPermissionRequired'), null, true);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        exif: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('Camera image URI:', imageUri);
        setSelectedImageUri(imageUri);
        setImagePickerVisible(false);
        setImageEditorVisible(true);
      } else {
        console.log('Camera cancelled or no image');
      }
    } catch (error) {
      console.error('Camera error:', error);
      showModal(t('error'), t('failedToTakePhoto'), null, true);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showModal(t('mediaPermissionDenied'), t('mediaPermissionRequired'), null, true);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        exif: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('Gallery image URI:', imageUri);
        setSelectedImageUri(imageUri);
        setImagePickerVisible(false);
        setImageEditorVisible(true);
      } else {
        console.log('Gallery cancelled or no image');
      }
    } catch (error) {
      console.error('Gallery error:', error);
      showModal(t('error'), t('failedToSelectPhoto'), null, true);
    }
  };

  const handleImageEditConfirm = (editedUri) => {
    setProfilePhoto(editedUri);
    setSelectedImageUri(null);
    setImageEditorVisible(false);
  };

  const handleImageEditCancel = () => {
    setSelectedImageUri(null);
    setImageEditorVisible(false);
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('editProfile')}</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
          <Text style={styles.editButtonText}>{isEditing ? t('cancel') : t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>
                {firstName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton} onPress={() => setImagePickerVisible(true)}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={styles.changePhotoText}>{t('changePhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('firstName')}</Text>
            <View style={isEditing ? [styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.primary }] : styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('enterYourFirstName')}
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('lastName')}</Text>
            <View style={isEditing ? [styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.primary }] : styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('enterYourLastName')}
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('emailAddress')}</Text>
            <View style={isEditing ? [styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.primary }] : styles.inputContainer}>
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
            <View style={isEditing ? [styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.primary }] : styles.inputContainer}>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('deliveryAddress') || t('address')}</Text>
            {address ? (
              isEditing ? (
                <LocationDetails
                  colors={colors}
                  isMapFullScreen={isMapFullScreen}
                  setIsMapFullScreen={setIsMapFullScreen}
                  mapRegion={mapRegion}
                  setMapRegion={setMapRegion}
                  markerCoordinate={markerCoordinate}
                  setMarkerCoordinate={setMarkerCoordinateWithConstruct}
                  locationPermission={locationPermission}
                  isLoadingLocation={isLoadingLocation}
                  searchLocation={searchLocation}
                  setSearchLocation={setSearchLocation}
                  streetAddress={streetAddress}
                  setStreetAddress={setStreetAddressWithConstruct}
                  city={city}
                  setCity={setCityWithConstruct}
                  postalCode={postalCode}
                  setPostalCode={setPostalCodeWithConstruct}
                  fieldErrors={fieldErrors}
                  clearFieldError={clearFieldError}
                  getCurrentLocation={getCurrentLocation}
                  searchAddress={searchAddress}

                  reverseGeocode={reverseGeocode}
                  label={label}
                  setLabel={setLabel}
                />
              ) : (
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                  <Text style={styles.input}>
                    {`${address.street || ''}${address.street ? ', ' : ''}${address.city || ''}${address.state ? ', ' : ''}${address.state || ''}${address.postalCode ? ' - ' : ''}${address.postalCode || ''}${address.country ? ', ' : ''}${address.country || ''}`}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.input, { color: colors.text.light }]}>{t('noAddress')}</Text>
              </View>
            )}
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          else setModalVisible(false);
        }}
        onlyConfirm={modalConfig.onlyConfirm}
        confirmText="OK"
      />
      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImagePickerVisible(false)}
        >
          <View
            style={styles.imagePickerContainer}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.imagePickerHeader}>
              <Text style={styles.imagePickerTitle}>
                {t('selectPhoto')}
              </Text>
            </View>
            <TouchableOpacity style={styles.imagePickerOption} onPress={pickFromCamera}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={styles.imagePickerText}>{t('takePhoto')}</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.imagePickerOption} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color={colors.primary} />
              <Text style={styles.imagePickerText}>{t('chooseFromGallery')}</Text>
            </TouchableOpacity>
            {profilePhoto && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.imagePickerOption} onPress={() => { setProfilePhoto(null); setImagePickerVisible(false); }}>
                  <Ionicons name="trash" size={24} color={colors.error || '#ff4444'} />
                  <Text style={styles.imagePickerText}>{t('removeCurrentPhoto')}</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.separator} />
            <TouchableOpacity style={styles.imagePickerOption} onPress={() => setImagePickerVisible(false)}>
              <Text style={[styles.imagePickerText, { color: colors.text.secondary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <ImageEditor
        visible={imageEditorVisible}
        imageUri={selectedImageUri}
        onConfirm={handleImageEditConfirm}
        onCancel={handleImageEditCancel}
        colors={colors}
      />
    </SafeAreaView>
  );
};



export default EditProfileScreen;
