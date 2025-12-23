import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useLocation } from '../contexts/LocationContext';
import { useProfile } from '../contexts/ProfileContext';
import LocationDetails from '../components/Profile/LocationDetails';
import { spacing, borderRadius, fontSize } from '../theme';
import { customerApi } from '../utils/api';
import { getUserId, getUserData } from '../utils/auth';

const LocationAddressScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const {
    saveAddress,
    address: contextAddress,
    city: contextCity,
    postalCode: contextPostalCode,
    currentLocation: contextLocation,
    getCurrentLocation: contextGetCurrentLocation,
    loading: contextLoading,
    savedAddresses,
    selectAddress,
  } = useLocation();
  const { updateProfile: updateProfileContext } = useProfile();

  // Local state for LocationDetails component
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: contextLocation?.latitude || 37.78825,
    longitude: contextLocation?.longitude || -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState(contextLocation);
  const [locationPermission, setLocationPermission] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [streetAddress, setStreetAddress] = useState(contextAddress || '');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [city, setCity] = useState(contextCity || '');
  const [postalCode, setPostalCode] = useState(contextPostalCode || '');
  const [label, setLabel] = useState('Home');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(newStatus === 'granted');
      }
    })();
  }, []);

  // Sync with context if it changes (optional, but good for init)
  useEffect(() => {
    if (contextLocation) {
      setMarkerCoordinate(contextLocation);
      setMapRegion(prev => ({
        ...prev,
        latitude: contextLocation.latitude,
        longitude: contextLocation.longitude
      }));
    }
  }, [contextLocation]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const data = await contextGetCurrentLocation();
      if (data) {
        setMarkerCoordinate(data.coords);
        setMapRegion(prev => ({
          ...prev,
          latitude: data.coords.latitude,
          longitude: data.coords.longitude,
          latitudeDelta: 0.005, // Zoom in
          longitudeDelta: 0.005
        }));
        setStreetAddress(data.address || '');
        setCity(data.city || '');
        setPostalCode(data.postalCode || '');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('error'), t('failedToGetLocation'));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchAddress = async () => {
    if (!searchLocation.trim()) return;
    setIsLoadingLocation(true);
    try {
      const geocodedLocation = await Location.geocodeAsync(searchLocation);
      if (geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        setMarkerCoordinate({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        await reverseGeocode(latitude, longitude);
      } else {
        Alert.alert(t('error'), t('locationNotFound'));
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('error'), t('addressSearchFailed'));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const addr = addresses[0];

        // Comprehensive address construction matching EditProfile and Header logic
        const addressParts = [
          addr.district,
          addr.street,
          addr.name,
          addr.subregion
        ].filter((val, index, self) => val && val.trim() !== '' && self.indexOf(val) === index);

        const newStreet = addressParts.join(', ');
        const newCity = addr.city || addr.region || '';
        const newPostal = addr.postalCode || '';

        setStreetAddress(newStreet);
        setCity(newCity);
        setPostalCode(newPostal);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errors = {};
    if (!streetAddress.trim()) errors.streetAddress = t('streetAddressRequired');
    if (!city.trim()) errors.city = t('cityRequired');
    if (!postalCode.trim()) errors.postalCode = t('postalCodeRequired');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectSavedAddress = async (addr) => {
    await selectAddress(addr);
    setStreetAddress(addr.address);
    setDetailedAddress(addr.detailedAddress || '');
    setCity(addr.city || '');
    setPostalCode(addr.postalCode || '');
    setLabel(addr.label || 'Home');
    if (addr.coordinates) {
      setMarkerCoordinate(addr.coordinates);
      setMapRegion(prev => ({
        ...prev,
        latitude: addr.coordinates.latitude,
        longitude: addr.coordinates.longitude
      }));
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      // 1. Save to local LocationContext (storage)
      const addressData = {
        address: streetAddress,
        detailedAddress: detailedAddress,
        city,
        postalCode,
        label,
        coordinates: markerCoordinate
      };

      const success = await saveAddress(addressData);

      if (success) {
        // 2. Sync to Backend Profile (Customer update)
        // This ensures the address is saved on the server immediately
        try {
          const customerId = await getUserId();
          const currentUser = await getUserData();

          if (customerId && currentUser) {
            const formData = new FormData();

            // Build the same profile update structure used in EditProfileScreen
            const updatedProfileData = {
              ...currentUser,
              address: addressData,
            };

            formData.append('data', JSON.stringify(updatedProfileData));

            console.debug('[LocationAddressScreen] Syncing address to backend profile...');
            await customerApi.patch(
              `/customers/${customerId}`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                timeout: 30000,
              }
            );
            console.debug('[LocationAddressScreen] Profile address updated successfully');

            // 3. Update ProfileContext to sync UI (Header, etc.)
            await updateProfileContext(updatedProfileData);
          }
        } catch (syncErr) {
          console.warn('[LocationAddressScreen] Failed to sync address to backend profile:', syncErr.message);
          // We still proceed since local save was successful, but warning is logged
        }

        if (route.params?.onSave) {
          route.params.onSave(addressData);
        }
        navigation.goBack();
      } else {
        Alert.alert(t('error'), t('saveFailed'));
      }
    } catch (err) {
      console.error('[LocationAddressScreen] handleSave error:', err);
      Alert.alert(t('error'), t('unexpectedError'));
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('addNewAddress')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        <LocationDetails
          colors={colors}
          isMapFullScreen={isMapFullScreen}
          setIsMapFullScreen={setIsMapFullScreen}
          mapRegion={mapRegion}
          setMapRegion={setMapRegion}
          markerCoordinate={markerCoordinate}
          setMarkerCoordinate={setMarkerCoordinate}
          locationPermission={locationPermission}
          isLoadingLocation={isLoadingLocation}
          searchLocation={searchLocation}
          setSearchLocation={setSearchLocation}
          streetAddress={streetAddress}
          setStreetAddress={setStreetAddress}
          detailedAddress={detailedAddress}
          setDetailedAddress={setDetailedAddress}
          city={city}
          setCity={setCity}
          postalCode={postalCode}
          setPostalCode={setPostalCode}
          fieldErrors={fieldErrors}
          clearFieldError={clearFieldError}
          getCurrentLocation={getCurrentLocation}
          searchAddress={searchAddress}
          reverseGeocode={reverseGeocode}
          label={label}
          setLabel={setLabel}
          savedAddresses={savedAddresses}
          onSelectAddress={handleSelectSavedAddress}
        />
      </View>

      {!isMapFullScreen && (
        <View style={[styles.footer, {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(16, insets.bottom + 16)
        }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6', // Light gray background for contrast or match theme if needed
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  }
});

export default LocationAddressScreen;
