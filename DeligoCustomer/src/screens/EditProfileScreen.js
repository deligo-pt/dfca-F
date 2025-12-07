import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { getUserData, saveUserData } from '../utils/auth';
import { useLanguage } from '../utils/LanguageContext';
import LocationDetails from '../components/Profile/LocationDetails';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { customerApi } from '../utils/api';
import CustomModal from '../components/CustomModal';
import * as ImagePicker from 'expo-image-picker';
import ImageEditor from '../components/ImageEditor';

const EditProfileScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [name, setName] = useState('');
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

        const derivedName = `${(routeUser.name?.firstName || routeUser.firstName || routeUser.name || routeUser.fullName || '')} ${(routeUser.name?.lastName || routeUser.lastName || '')}`.trim();
        setName(derivedName || routeUser.displayName || '');
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
        return;
      }

      const localUserData = await getUserData();
      setUserDataState(localUserData);
      setName(localUserData?.name ? `${localUserData.name.firstName} ${localUserData.name.lastName}`.trim() : '');
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
      const currentUser = userInfo || await getUserData();
      const customerId = currentUser?.userId || currentUser?.id || currentUser?._id;

      if (!customerId) {
        console.error('No customer ID found:', currentUser);
        throw new Error('Customer ID not found. Please log in again.');
      }

      const formData = new FormData();

      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updatedProfileData = {
        name: { firstName, lastName },
        contactNumber: mobile,
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
      if (!name.trim()) {
        showModal('Error', 'Please enter your full name', null, true);
        return;
      }

      if (!mobile.trim()) {
        showModal('Error', 'Please enter your mobile number', null, true);
        return;
      }

      if (!address) {
        showModal('Error', 'Please provide your address', null, true);
        return;
      }
      // Send the update to the server
      await updateProfile({ address }, profilePhoto, userData);

      // After a successful API call, manually update the local user data.
      // This is more reliable than depending on the API response body.
      const currentLocalUser = await getUserData();
      const nameParts = name.trim().split(' ');
      const updatedUser = {
          ...currentLocalUser,
          name: {
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || ''
          },
          contactNumber: mobile,
          address: address,
          profilePhoto: profilePhoto || currentLocalUser.profilePhoto,
      };

      // Save the merged user object back to storage.
      await saveUserData(updatedUser);

      showModal(t('success'), t('profileUpdated'), () => {
        setModalVisible(false);
        setIsEditing(false);
        navigation.goBack();
      }, true);

    } catch (error) {
      console.error('Save failed:', error);
      showModal('Error', error.message || 'Failed to save changes', null, true);
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
        showModal('Permission Denied', 'Location permission is required to get current location.', null, true);
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
      showModal('Error', 'Failed to get current location.', null, true);
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
        showModal('Error', 'Google Maps API key not configured', null, true);
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
        };

        setAddress(updatedAddress);
        setSearchLocation('');
      } else {
        showModal('No Results', 'No places found. Please try a different search.', null, true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      showModal('Error', 'Failed to search for the address. Please try again.', null, true);
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
        showModal('Permission Denied', 'Camera permission is required to take photos.', null, true);
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
      showModal('Error', 'Failed to take photo. Please try again.', null, true);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showModal('Permission Denied', 'Media library permission is required to select photos.', null, true);
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
      showModal('Error', 'Failed to select photo. Please try again.', null, true);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: colors.text.primary }]}>{t('editProfile')}</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
          <Text style={[styles.editButtonText, { color: colors.primary }]}>{isEditing ? t('cancel') : t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.avatarSection, { backgroundColor: colors.background }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text.white }]}>
                {name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setImagePickerVisible(true)}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>{t('changePhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.background }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{t('fullName')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }, isEditing && { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={name}
                onChangeText={setName}
                placeholder={t('enterYourName')}
                editable={isEditing}
                placeholderTextColor={colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{t('emailAddress')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }, isEditing && { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
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
            <Text style={[styles.label, { color: colors.text.primary }]}>{t('mobileNumber')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }, isEditing && { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
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
            <Text style={[styles.label, { color: colors.text.primary }]}>{t('address')}</Text>
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
                />
              ) : (
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                  <Text style={[styles.input, { color: colors.text.primary }]}>
                    {`${address.street || ''}${address.street ? ', ' : ''}${address.city || ''}${address.state ? ', ' : ''}${address.state || ''}${address.postalCode ? ' - ' : ''}${address.postalCode || ''}${address.country ? ', ' : ''}${address.country || ''}`}
                  </Text>
                </View>
              )
            ) : (
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.input, { color: colors.text.light }]}>{t('noAddress')}</Text>
              </View>
            )}
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleSave}>
            <Text style={[styles.saveButtonText, { color: colors.text.white }]}>{t('saveChanges')}</Text>
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
            style={[styles.imagePickerContainer, { backgroundColor: colors.background }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.imagePickerHeader}>
              <Text style={[styles.imagePickerTitle, { color: colors.text.primary }]}>
                Select Photo
              </Text>
            </View>
            <TouchableOpacity style={styles.imagePickerOption} onPress={pickFromCamera}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={[styles.imagePickerText, { color: colors.text.primary }]}>Take Photo</Text>
            </TouchableOpacity>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.imagePickerOption} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color={colors.primary} />
              <Text style={[styles.imagePickerText, { color: colors.text.primary }]}>Choose from Gallery</Text>
            </TouchableOpacity>
            {profilePhoto && (
              <>
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.imagePickerOption} onPress={() => { setProfilePhoto(null); setImagePickerVisible(false); }}>
                  <Ionicons name="trash" size={24} color={colors.error || '#ff4444'} />
                  <Text style={[styles.imagePickerText, { color: colors.text.primary }]}>Remove Current Photo</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.imagePickerOption} onPress={() => setImagePickerVisible(false)}>
              <Text style={[styles.imagePickerText, { color: colors.text.secondary }]}>Cancel</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  content: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
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
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
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
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    marginLeft: 12,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 1,
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
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 12,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
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
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
});

export default EditProfileScreen;
