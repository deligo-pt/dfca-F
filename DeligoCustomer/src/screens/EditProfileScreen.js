import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { getUserData } from '../utils/auth';
import { useLanguage } from '../utils/LanguageContext';
import LocationDetails from '../components/Profile/LocationDetails';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const EditProfileScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  // Address object state: show and optionally edit address details
  const [address, setAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // sensible default address (from user's request)
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

  // Location details state
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

  // Function to construct address object from individual fields
  const constructAddressFromFields = () => {
    const newAddress = {
      street: streetAddress || '',
      city: city || '',
      state: defaultAddress.state, // Use default state since it's not editable in the form
      country: defaultAddress.country, // Use default country since it's not editable in the form
      postalCode: postalCode || '',
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,
      geoAccuracy: 5,
    };
    console.log('🏗️ Constructed address from fields:', newAddress);
    setAddress(newAddress);
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
        const derivedName = `${(routeUser.name?.firstName || routeUser.firstName || routeUser.name || routeUser.fullName || '')} ${(routeUser.name?.lastName || routeUser.lastName || '')}`.trim();
        setName(derivedName || routeUser.displayName || '');
        setEmail(routeUser.email || routeUser.contactEmail || '');
        setMobile(routeUser.contactNumber || routeUser.phone || routeUser.mobile || '');
        setProfilePhoto(routeUser.profilePhoto || routeUser.photo || routeUser.avatar || routeUser.photoUrl || routeUser.avatarUrl || null);
        // set address if present on route user, otherwise use provided default
        const addr = routeUser.address || routeUser.location || defaultAddress;
        setAddress(addr);
        // Update location details state
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

      const userData = await getUserData();
      setName(userData?.name || '');
      setEmail(userData?.email || '');
      setMobile(userData?.mobile || '');
      setProfilePhoto(userData?.profilePhoto || userData?.photo || userData?.avatarUrl || userData?.avatar || null);
      // prefer explicit address property, fall back to defaultAddress
      const addr = userData?.address || userData?.location || defaultAddress;
      setAddress(addr);
      // Update location details state
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

  const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert(t('success'), t('profileUpdated'));
    setIsEditing(false);
  };

  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get current location.');
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
      Alert.alert('Error', 'Failed to get current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchAddress = async () => {
    if (!searchLocation.trim()) return;
    setIsLoadingLocation(true);
    try {
      // Get Google Maps API key from app config
      const googleMapsApiKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
                              Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

      if (!googleMapsApiKey) {
        Alert.alert('Error', 'Google Maps API key not configured');
        return;
      }

      console.log('🔍 Searching for address:', searchLocation);

      // Step 1: Use Google Places API Text Search to find places
      const textSearchResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchLocation)}&key=${googleMapsApiKey}`
      );

      const textSearchData = await textSearchResponse.json();
      console.log('📡 Google Places Text Search Response:', textSearchData);

      if (textSearchData.status === 'OK' && textSearchData.results && textSearchData.results.length > 0) {
        const place = textSearchData.results[0];
        const placeId = place.place_id;
        const { lat, lng } = place.geometry.location;

        console.log('📍 Selected place from text search:', place);
        console.log('📍 Place ID:', placeId);

        // Step 2: Get detailed place information including address_components
        const placeDetailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,geometry,name&key=${googleMapsApiKey}`
        );

        const placeDetailsData = await placeDetailsResponse.json();
        console.log('📋 Google Places Details Response:', placeDetailsData);

        let detailedPlace = place; // fallback to text search result
        if (placeDetailsData.status === 'OK' && placeDetailsData.result) {
          detailedPlace = placeDetailsData.result;
          console.log('📍 Detailed place with address components:', detailedPlace);
        }

        console.log('📍 Place geometry:', detailedPlace.geometry);
        console.log('📍 Place address components:', detailedPlace.address_components);

        // Update map region and marker
        setMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setMarkerCoordinate({ latitude: lat, longitude: lng });

        // Update address fields - keep it simple, just use formatted address for street
        setStreetAddress(detailedPlace.formatted_address || detailedPlace.name || '');

        // Extract only city and postal code - no building number extraction needed
        let cityComponent = null;
        let postalComponent = null;

        if (detailedPlace.address_components) {
          cityComponent = detailedPlace.address_components.find(component =>
            component.types.includes('locality') || component.types.includes('administrative_area_level_2')
          );
          postalComponent = detailedPlace.address_components.find(component =>
            component.types.includes('postal_code')
          );

          console.log('🏙️ City component:', cityComponent);
          console.log('📮 Postal component:', postalComponent);

          if (cityComponent) {
            setCity(cityComponent.long_name);
          }
          if (postalComponent) {
            setPostalCode(postalComponent.long_name);
          }
        } else {
          console.log('⚠️ No address components available from Place Details API');
        }

        // Update the main address state - simple structure as requested
        const updatedAddress = {
          street: detailedPlace.formatted_address || detailedPlace.name || '',
          city: cityComponent?.long_name || 'Dhaka',
          state: 'Badda', // Default state
          country: 'Bangladesh', // Default country
          postalCode: postalComponent?.long_name || '1212',
          latitude: lat,
          longitude: lng,
          geoAccuracy: 5,
        };

        console.log('📝 Updated address object:', updatedAddress);
        setAddress(updatedAddress);

        // Clear search input
        setSearchLocation('');
      } else {
        console.log('❌ No results found for query:', searchLocation);
        Alert.alert('No Results', 'No places found for the search query. Please try a different search term.');
      }
    } catch (error) {
      console.error('❌ Error searching address:', error);
      Alert.alert('Error', 'Failed to search for the address. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      let addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        console.log('🔄 Reverse geocoded address:', addr);

        setStreetAddress(addr.street || '');
        setCity(addr.city || '');
        setPostalCode(addr.postalCode || '');

        // Use streetNumber from Expo Location API if available
        if (addr.streetNumber) {
          setStreetNumber(addr.streetNumber);
          console.log('🏠 Street number from GPS:', addr.streetNumber);
        }

        // Note: Expo Location API provides streetNumber but NOT building/suite numbers
        // Building/suite numbers are only available from Google Places API (subpremise component)

        // Update address state
        setAddress(prev => ({
          ...prev,
          street: addr.street || prev?.street || '',
          city: addr.city || prev?.city || '',
          state: addr.region || prev?.state || '',
          postalCode: addr.postalCode || prev?.postalCode || '',
          country: addr.country || prev?.country || '',
          latitude,
          longitude,
          geoAccuracy: 5, // Default accuracy value
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  // Custom setters that also construct address object
  const setStreetAddressWithConstruct = (value) => {
    setStreetAddress(value);
    // Delay to allow state update, then construct address
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }] }>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: colors.text.primary }]}>{t('editProfile')}</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
          <Text style={[styles.editButtonText, { color: colors.primary }]}>{isEditing ? t('cancel') : t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={[styles.avatarSection, { backgroundColor: colors.background }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }] }>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text.white }]}>
                {name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>{t('changePhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
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

          {/* Address Section */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{t('address')}</Text>
            {address ? (
              // show editable fields when editing, otherwise a read-only formatted view
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
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }] }>
                  <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                  <Text style={[styles.input, { color: colors.text.primary }]}>
                    {`${address.street || ''}${address.street ? ', ' : ''}${address.city || ''}${address.state ? ', ' : ''}${address.state || ''}${address.postalCode ? ' - ' : ''}${address.postalCode || ''}${address.country ? ', ' : ''}${address.country || ''}`}
                  </Text>
                </View>
              )
            ) : (
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }] }>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.input, { color: colors.text.light }]}>{t('noAddress')}</Text>
              </View>
            )}
          </View>

        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleSave}>
            <Text style={[styles.saveButtonText, { color: colors.text.white }]}>{t('saveChanges')}</Text>
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
    minWidth: 88, // allow longer localized labels like "Cancelar"
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
    // backgroundColor set via theme in JSX
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
});

export default EditProfileScreen;
