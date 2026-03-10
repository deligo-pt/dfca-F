import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, StatusBar, Modal, ActivityIndicator } from 'react-native';
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
import AddressApi from '../utils/addressApi';
import { getUserId, getUserData } from '../utils/auth';

/**
 * LocationAddressScreen
 * 
 * Manages address entry and location selection.
 * Features:
 * - Interactive map for precise pinning.
 * - Address autocomplete and search.
 * - Reverse geocoding for coordinate-based addressing.
 * - Form validation for required address fields.
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation controller.
 * @param {Object} props.route - Route params (e.g., mode, onSave callback).
 */
const LocationAddressScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const {
    saveAddress,
    address: contextAddress,
    detailedAddress: contextDetailedAddress,
    city: contextCity,
    postalCode: contextPostalCode,
    state: contextState,
    country: contextCountry,
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
  const [state, setState] = useState(contextState || '');
  const [country, setCountry] = useState(contextCountry || '');
  const [label, setLabel] = useState('Home');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error', // 'error', 'success', 'info'
    onOk: null
  });

  const showModal = (title, message, onOk = null) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type: 'error',
      onOk
    });
  };

  const hideModal = () => {
    const callback = modalConfig.onOk;
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (callback) callback();
  };

  const [isSaving, setIsSaving] = useState(false);

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

  // Sync with edit mode
  useEffect(() => {
    if (route.params?.mode === 'edit_delivery_address' && route.params?.addressToEdit) {
      const editAddr = route.params.addressToEdit;
      setStreetAddress(editAddr.street || editAddr.address || '');
      setDetailedAddress(editAddr.detailedAddress || '');
      setCity(editAddr.city || '');
      setPostalCode(editAddr.postalCode || '');
      setState(editAddr.state || 'Dhaka Division');
      setCountry(editAddr.country || 'Bangladesh');
      setLabel(editAddr.addressType === 'OFFICE' ? 'Work' : editAddr.addressType === 'OTHER' ? 'Other' : 'Home');
      if (editAddr.latitude && editAddr.longitude) {
        const coords = { latitude: editAddr.latitude, longitude: editAddr.longitude };
        setMarkerCoordinate(coords);
        setMapRegion(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
      }
    }
  }, [route.params?.mode, route.params?.addressToEdit]);

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

  // Fallback: Sync form with context address if fields are empty (handles async storage load)
  useEffect(() => {
    if (!streetAddress && contextAddress) setStreetAddress(contextAddress);
    if (!detailedAddress && contextDetailedAddress) setDetailedAddress(contextDetailedAddress);
    if (!city && contextCity) setCity(contextCity);
    if (!postalCode && contextPostalCode) setPostalCode(contextPostalCode);
    if (!state && contextState) setState(contextState);
    if (!country && contextCountry) setCountry(contextCountry);
  }, [contextAddress, contextDetailedAddress, contextCity, contextPostalCode, contextState, contextCountry]);

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
        setState(data.state || 'Dhaka Division');
        setCountry(data.country || 'Bangladesh');
      }
    } catch (error) {
      console.error(error);
      showModal(t('error'), t('failedToGetLocation'));
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
        showModal(t('error'), t('locationNotFound'));
      }
    } catch (error) {
      console.error(error);
      showModal(t('error'), t('addressSearchFailed'));
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
        const newState = addr.region || addr.subregion || 'Dhaka Division';
        const newCountry = addr.country || 'Bangladesh';

        setStreetAddress(newStreet);
        setCity(newCity);
        setPostalCode(newPostal);
        setState(newState);
        setCountry(newCountry);
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
    setState(addr.state || 'Dhaka Division');
    setCountry(addr.country || 'Bangladesh');
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

    setIsSaving(true);
    try {
      const addressData = {
        address: streetAddress,
        detailedAddress: detailedAddress,
        city,
        postalCode,
        state: state || 'Dhaka Division',
        country: country || 'Bangladesh',
        label,
        coordinates: markerCoordinate
      };

      // Custom mode for adding/editing delivery addresses directly to the list via API
      if (route.params?.mode === 'add_delivery_address' || route.params?.mode === 'edit_delivery_address') {
        try {
          const isEditTemplate = route.params?.mode === 'edit_delivery_address';

          const payload = {
            deliveryAddress: {
              street: streetAddress,
              detailedAddress: detailedAddress,
              city: city,
              state: state,
              country: country,
              postalCode: postalCode,
              latitude: markerCoordinate?.latitude,
              longitude: markerCoordinate?.longitude,
              // Map friendly labels to backend enums if possible
              addressType: label === 'Work' ? 'OFFICE' : label === 'Other' ? 'OTHER' : 'HOME',
              // retain active state if editing, force active if adding
              isActive: isEditTemplate ? route.params.addressToEdit?.isActive : true
            }
          };

          let res;
          if (isEditTemplate && route.params?.addressToEdit?._id) {
            console.debug('[LocationAddressScreen] Editing delivery address:', payload);
            res = await AddressApi.updateDeliveryAddress(route.params.addressToEdit._id, payload);
          } else {
            console.debug('[LocationAddressScreen] Adding delivery address:', payload);
            res = await AddressApi.addDeliveryAddress(payload);
          }

          if (res.data && res.data.success === false) {
            throw new Error(res.data.message || 'Failed');
          }

          if (route.params?.onSave) {
            route.params.onSave(addressData);
          }
          navigation.goBack();
          return;
        } catch (apiErr) {
          // Robust Exception Handling: Check for 409 (Duplicate Address)
          if (apiErr.response && (apiErr.response.status === 409 || apiErr.response?.data?.status === 409)) {
            console.warn('[LocationAddressScreen] Address already exists (409). Fetching profile to retrieve existing ID...');
            try {
              // Fetch fresh profile using the /profile endpoint which works with the current user's token
              const profileRes = await customerApi.get('/profile');
              const freshAddresses = profileRes.data?.data?.deliveryAddresses || profileRes.data?.deliveryAddresses || [];

              // Helper to find address
              const findMatchingAddress = (list, target) => {
                if (!Array.isArray(list) || !list.length) return null;
                return list.find(a =>
                  (a.latitude === target.latitude && a.longitude === target.longitude) ||
                  (a.street === target.street) ||
                  (a.address === target.address)
                );
              };

              // Try to find the address we just failed to add
              const targetAddr = {
                latitude: markerCoordinate?.latitude,
                longitude: markerCoordinate?.longitude,
                street: streetAddress,
                detailedAddress: detailedAddress,
                address: streetAddress
              };

              let match = findMatchingAddress(freshAddresses, targetAddr);

              // Fallback loose match
              if (!match) {
                match = freshAddresses.find(a => a.street === targetAddr.street);
              }

              if (match) {
                console.debug('[LocationAddressScreen] Found existing address ID:', match._id);
                const existingAddressData = { ...addressData, _id: match._id, id: match._id };

                // Ensure this existing address is selected so Checkout can see it
                await selectAddress({
                  ...match,
                  address: match.street || match.address,
                  detailedAddress: match.detailedAddress || '',
                  coordinates: {
                    latitude: match.latitude,
                    longitude: match.longitude
                  },
                  label: match.addressType || label
                });

                if (route.params?.onSave) {
                  route.params.onSave(existingAddressData);
                }
                // User requested to show error even if found
                showModal(t('error'), t('addressAlreadyExists'), () => navigation.goBack());
                return;
              } else {
                console.warn('[LocationAddressScreen] Could not look up existing address despite 409.');
                showModal(t('error'), t('addressAlreadyExists'));
              }

            } catch (lookupErr) {
              console.warn('[LocationAddressScreen] Failed to lookup existing address:', lookupErr);
            }
          }

          // Check for 400 Bad Request (Max Limit Reached)
          if (apiErr.response && apiErr.response.status === 400) {
            const errorMsg = apiErr.response.data?.message || '';
            if (errorMsg.includes('maximum number of delivery addresses')) {
              showModal(t('limitReached'), t('maxAddressesReached'));
              return;
            }
          }

          // Check for 401 Unauthorized
          if (apiErr.response && apiErr.response.status === 401) {
            console.error('[LocationAddressScreen] Unauthorized (401). Redirecting to login or showing error.');
            showModal(t('error'), t('sessionExpired') || 'Session Expired');
            // Optionally trigger logout if not handled by interceptor
            return;
          }

          console.error('[LocationAddressScreen] add-delivery-address error:', apiErr);
          showModal(t('error'), t('saveFailed'));
          return;
        }
      }

      // Default behavior: Save to local LocationContext (storage)
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
        showModal(t('error'), t('saveFailed'));
      }
    } catch (err) {
      console.error('[LocationAddressScreen] handleSave error:', err);
      showModal(t('error'), t('unexpectedError'));
    } finally {
      setIsSaving(false);
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {route.params?.mode === 'edit_delivery_address' ? t('editAddress') || 'Edit Address' : t('addNewAddress')}
        </Text>
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
          state={state}
          setState={setState}
          country={country}
          setCountry={setCountry}
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
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Math.max(16, insets.bottom + 16)
        }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={modalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{modalConfig.title}</Text>
            <Text style={[styles.modalMessage, { color: colors.text.secondary }]}>
              {modalConfig.message}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={hideModal}
            >
              <Text style={styles.modalButtonText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default LocationAddressScreen;
