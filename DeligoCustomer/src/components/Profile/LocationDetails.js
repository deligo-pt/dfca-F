import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_MAPS_CONFIG } from '../../constants/config';
import { useTheme, darkMapStyle } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

/**
 * LocationDetails Component
 * 
 * Comprehensive form for location data entry.
 * Features:
 * - Map integration (Google Maps) for pin placement.
 * - Address search and manual field entry.
 * - Saved address management.
 * 
 * @param {Object} props
 * @param {Object} props.colors - Theme colors.
 * @param {boolean} props.isMapFullScreen - Fullscreen map toggle.
 * @param {Function} props.setIsMapFullScreen - State setter.
 * @param {Object} props.mapRegion - Current map region.
 * @param {Function} props.setMapRegion - Region setter.
 * @param {Object} props.markerCoordinate - Pin coordinates.
 * @param {Function} props.setMarkerCoordinate - Coordinates setter.
 * @param {Function} props.getCurrentLocation - Geolocation trigger.
 * @param {Function} props.reverseGeocode - Coordinate to address converter.
 */
const LocationDetails = ({
  colors,
  isMapFullScreen,
  setIsMapFullScreen,
  mapRegion,
  setMapRegion,
  markerCoordinate,
  setMarkerCoordinate,
  locationPermission,
  isLoadingLocation,
  searchLocation,
  setSearchLocation,
  streetAddress,
  setStreetAddress,
  detailedAddress,
  setDetailedAddress,
  city,
  setCity,
  postalCode,
  setPostalCode,
  state,
  setState,
  country,
  setCountry,
  fieldErrors,
  clearFieldError,
  getCurrentLocation,
  searchAddress,

  reverseGeocode,
  label,
  setLabel,
  savedAddresses,
  onSelectAddress,
}) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();

  const styles = useMemo(() => StyleSheet.create({
    professionalLocationWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    professionalHeader: {
      paddingVertical: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
    },
    professionalTitle: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Poppins-Bold',
      marginBottom: 6,
      color: colors.text.primary,
    },
    professionalSubtitle: {
      fontSize: 14,
      fontFamily: 'Poppins-Regular',
      lineHeight: 20,
      color: colors.text.secondary,
    },
    professionalScrollView: {
      flex: 1,
    },
    professionalScrollContent: {
      paddingBottom: 30,
    },
    internationalSearchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      zIndex: 5000, // Ensure dropdown appears above other content
      elevation: 5000,
    },
    internationalSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    internationalSearchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Poppins-Regular',
      marginLeft: 10,
      marginRight: 10,
      color: colors.text.primary,
    },
    searchBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchClearButton: {
      padding: 4,
    },
    searchGoButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    searchLoadingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 8,
    },
    searchLoadingText: {
      fontSize: 13,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
    },
    quickActionsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    quickActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1.5,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginLeft: 8,
      color: colors.text.secondary,
    },
    internationalMapPreview: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    mapPreviewTouchable: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapPreview: {
      width: '100%',
      height: 280,
    },
    mapPreviewPin: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    mapPreviewPinCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 3,
      borderColor: colors.surface,
      backgroundColor: colors.primary,
    },
    mapPreviewPinStem: {
      width: 3,
      height: 18,
      marginTop: -1,
      backgroundColor: colors.primary,
    },
    mapPreviewOverlay: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      alignItems: 'center',
    },
    mapPreviewExpandButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      backgroundColor: colors.primary,
    },
    mapPreviewExpandText: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.white,
      marginLeft: 6,
    },
    internationalConfirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      backgroundColor: colors.border,
    },
    internationalConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginLeft: 8,
      color: colors.text.light,
    },
    addressConfirmedCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      backgroundColor: isDarkMode ? colors.surfaceVariant : '#ECFDF5',
      borderColor: colors.success,
    },
    addressConfirmedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    addressConfirmedTitle: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Poppins-Bold',
      color: colors.success,
      marginLeft: 6,
      textTransform: 'uppercase',
    },
    addressConfirmedText: {
      fontSize: 14,
      fontFamily: 'Poppins-Medium',
      color: colors.text.primary,
      lineHeight: 20,
    },
    internationalFormSection: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    formSectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'Poppins-Bold',
      marginBottom: 4,
      color: colors.text.primary,
    },
    formSectionSubtitle: {
      fontSize: 13,
      fontFamily: 'Poppins-Regular',
      marginBottom: 20,
      color: colors.text.secondary,
    },
    internationalFieldGroup: {
      marginBottom: 16,
    },
    internationalFieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 8,
      color: colors.text.primary,
    },
    requiredMark: {
      color: colors.error,
    },
    internationalInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderRadius: 10,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    internationalInputText: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Poppins-Regular',
      marginLeft: 10,
      color: colors.text.primary,
    },
    internationalErrorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      marginLeft: 2,
    },
    internationalErrorText: {
      fontSize: 12,
      color: colors.error,
      fontFamily: 'Poppins-Regular',
      marginLeft: 4,
    },
    gpsCoordinatesCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      marginTop: 8,
      backgroundColor: isDarkMode ? colors.surfaceVariant : '#F0F9FF',
      borderColor: colors.primary,
    },
    gpsCoordinatesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    gpsCoordinatesLabel: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Poppins-Bold',
      color: colors.primary,
      marginLeft: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    gpsCoordinatesValue: {
      fontSize: 13,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
      marginBottom: 8,
    },
    gpsCoordinatesStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gpsCoordinatesStatusText: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      color: colors.success,
      marginLeft: 4,
    },
    professionalHelpCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 10,
      marginTop: 20,
      marginBottom: 10,
      borderLeftWidth: 3,
    },
    professionalHelpContent: {
      flex: 1,
      marginLeft: 10,
    },
    professionalHelpTitle: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 4,
    },
    professionalHelpText: {
      fontSize: 13,
      fontFamily: 'Poppins-Regular',
      lineHeight: 20,
    },
    fullScreenMapContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullScreenMap: {
      ...StyleSheet.absoluteFillObject,
    },
    fullScreenPin: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    fullScreenPinCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 12,
      borderWidth: 4,
      borderColor: colors.surface,
      backgroundColor: colors.primary,
    },
    fullScreenPinStem: {
      width: 4,
      height: 24,
      marginTop: -1,
      backgroundColor: colors.primary,
    },
    fullScreenPinShadow: {
      width: 28,
      height: 12,
      borderRadius: 14,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      marginTop: 8,
    },
    fullScreenControls: {
      position: 'absolute',
      top: 50, // Moved down for status bar
      left: 20,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      zIndex: 10,
    },
    fullScreenButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 25, // More rounded pill shape
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      backgroundColor: colors.surface,
    },
    fullScreenButtonText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins-SemiBold',
      marginLeft: 8,
      color: colors.text.primary, // Neutral text color
    },
    fullScreenRightControls: {
      alignItems: 'flex-end',
      gap: 12,
    },
    fullScreenIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      backgroundColor: colors.surface,
    },
    fullScreenZoomButtons: {
      marginTop: 0, // Handled by gap
      gap: 12, // Consistent gap
    },
    fullScreenConfirmContainer: {
      position: 'absolute',
      bottom: 40,
      left: 20,
      right: 20,
      zIndex: 10,
      alignItems: 'center',
    },
    fullScreenConfirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 16,
      borderRadius: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      backgroundColor: colors.primary,
    },
    fullScreenConfirmText: {
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'Poppins-Bold',
      color: '#fff',
      marginLeft: 8,
    },
    labelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12, // Slightly taller
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12, // More rounded
      gap: 8,
    },
    labelButtonText: {
      fontSize: 14,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
    },
    savedAddressesSection: {
      marginTop: 24,
      marginBottom: 24,
    },
    savedAddressCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      width: 170, // Slightly wider
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12, // Spacing between cards
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    savedAddressIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      backgroundColor: colors.primary + '15',
    },
    savedAddressLabel: {
      fontSize: 15,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 4,
      color: colors.text.primary,
    },
    savedAddressText: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 2,
      lineHeight: 18,
    },
    savedAddressSubText: {
      fontSize: 12,
      color: colors.text.light,
    },
  }), [colors, isDarkMode]);

  const labels = [
    { id: 'Home', icon: 'home', label: t('home') },
    { id: 'Work', icon: 'briefcase', label: t('work') },
    { id: 'Other', icon: 'location', label: t('other') },
  ];
  return (
    <View style={styles.professionalLocationWrapper}>
      <View style={styles.professionalHeader}>
        <Text style={[styles.professionalTitle, { color: colors.text.primary }]}>
          {streetAddress ? t('confirmLocation') : t('addNewAddress')}
        </Text>
        <Text style={[styles.professionalSubtitle, { color: colors.text.secondary }]}>
          {t('selectLabelAndSave')}
        </Text>
      </View>

      {/* Full-screen Map Modal for precise pin adjustment */}
      <Modal
        visible={isMapFullScreen}
        animationType="slide"
        onRequestClose={() => setIsMapFullScreen(false)}
        statusBarTranslucent
      >
        <View style={styles.fullScreenMapContainer}>
          <MapView
            style={styles.fullScreenMap}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            onRegionChangeComplete={(region) => {
              setMapRegion(region);
              setMarkerCoordinate({
                latitude: region.latitude,
                longitude: region.longitude,
              });
            }}
            showsUserLocation={locationPermission}
            showsMyLocationButton={false}
            showsCompass={false} // Custom compass/controls
            showsBuildings={true}
            showsPointsOfInterest={true}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
            customMapStyle={isDarkMode ? darkMapStyle : []}
          />

          <View style={styles.fullScreenPin} pointerEvents="none">
            <View style={[styles.fullScreenPinCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="location" size={28} color={colors.text.white} />
            </View>
            <View style={[styles.fullScreenPinStem, { backgroundColor: colors.primary }]} />
            <View style={styles.fullScreenPinShadow} />
          </View>

          <View style={styles.fullScreenControls}>
            <TouchableOpacity
              style={[styles.fullScreenButton]}
              onPress={() => setIsMapFullScreen(false)}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
              <Text style={styles.fullScreenButtonText}>{t('back')}</Text>
            </TouchableOpacity>

            <View style={styles.fullScreenRightControls}>
              <TouchableOpacity
                style={[styles.fullScreenIconButton]}
                onPress={() => {
                  if (!isLoadingLocation) {
                    getCurrentLocation();
                  }
                }}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="locate" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>

              <View style={styles.fullScreenZoomButtons}>
                <TouchableOpacity
                  style={[styles.fullScreenIconButton]}
                  onPress={() => {
                    setMapRegion(prev => ({
                      ...prev,
                      latitudeDelta: Math.max(0.001, prev.latitudeDelta / 2),
                      longitudeDelta: Math.max(0.001, prev.longitudeDelta / 2),
                    }));
                  }}
                >
                  <Ionicons name="add" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fullScreenIconButton]}
                  onPress={() => {
                    setMapRegion(prev => ({
                      ...prev,
                      latitudeDelta: Math.min(90, prev.latitudeDelta * 2),
                      longitudeDelta: Math.min(180, prev.longitudeDelta * 2),
                    }));
                  }}
                >
                  <Ionicons name="remove" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.fullScreenConfirmContainer}>
            <TouchableOpacity
              style={[styles.fullScreenConfirmButton, {
                backgroundColor: markerCoordinate ? colors.primary : colors.border,
                opacity: (!markerCoordinate || isLoadingLocation) ? 0.8 : 1
              }]}
              onPress={async () => {
                if (markerCoordinate) {
                  await reverseGeocode(markerCoordinate.latitude, markerCoordinate.longitude);
                  setIsMapFullScreen(false);
                }
              }}
              disabled={!markerCoordinate || isLoadingLocation}
            >
              {isLoadingLocation ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.fullScreenConfirmText}>{t('locating')}...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.fullScreenConfirmText}>{t('confirmLocation')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!isMapFullScreen && (
        <View style={styles.internationalSearchContainer}>
          <GooglePlacesAutocomplete
            placeholder={t('searchBusinessAddress')}
            fetchDetails={true}
            onPress={(data, details = null) => {
              if (details) {
                const { lat, lng } = details.geometry.location;
                setMapRegion({
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                });
                setMarkerCoordinate({
                  latitude: lat,
                  longitude: lng,
                });

                // Extract address components
                const addressComponents = details.address_components;
                let street = '';
                let city = '';
                let postalCode = '';
                let state = '';
                let country = '';

                addressComponents.forEach(component => {
                  const types = component.types;
                  if (types.includes('route')) {
                    street = component.long_name;
                  } else if (types.includes('locality')) {
                    city = component.long_name;
                  } else if (types.includes('postal_code')) {
                    postalCode = component.long_name;
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.long_name;
                  } else if (types.includes('country')) {
                    country = component.long_name;
                  }
                });

                setStreetAddress(street || data.description);
                setCity(city);
                setPostalCode(postalCode);
                setState(state);
                setCountry(country);
              }
            }}
            query={{
              key: GOOGLE_MAPS_CONFIG.apiKey,
              language: 'en',
            }}
            styles={{
              container: {
                flex: 0,
              },
              textInputContainer: {
                backgroundColor: colors.surface,
                borderWidth: 0,
                borderColor: 'transparent',
                borderRadius: 12,
                paddingHorizontal: 8,
              },
              textInput: {
                height: 48,
                color: colors.text.primary,
                fontSize: 16,
                backgroundColor: 'transparent',
                underlineColorAndroid: 'transparent',
                borderWidth: 0,
              },
              predefinedPlacesDescription: {
                color: '#1faadb',
              },
              listView: {
                backgroundColor: colors.surface,
                borderRadius: 12,
                marginTop: 8,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                zIndex: 1000,
              },
              row: {
                backgroundColor: colors.surface,
                padding: 13,
                height: 44,
                flexDirection: 'row',
              },
              description: {
                color: colors.text.primary,
              },
            }}
            enablePoweredByContainer={false}
            nearbyPlacesAPI="GooglePlacesSearch"
            debounce={400}
          />
        </View>
      )}

      {!isMapFullScreen && (
        <ScrollView
          style={styles.professionalScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.professionalScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionButton, {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              }]}
              onPress={() => {
                if (!isLoadingLocation) {
                  getCurrentLocation();
                }
              }}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="navigate-circle" size={20} color={colors.primary} />
              )}
              <Text style={[styles.quickActionText, { color: colors.primary }]}>
                {isLoadingLocation ? t('locating') : t('useGPS')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              }]}
              onPress={() => setIsMapFullScreen(true)}
            >
              <Ionicons name="map" size={20} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>
                {t('fullMap') || 'Full Map'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.internationalMapPreview}>
            <TouchableOpacity
              style={styles.mapPreviewTouchable}
              onPress={() => setIsMapFullScreen(true)}
              activeOpacity={0.9}
            >
              <MapView
                style={styles.mapPreview}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                showsUserLocation={locationPermission}
                showsMyLocationButton={false}
                customMapStyle={isDarkMode ? darkMapStyle : []}
              />

              <View style={styles.mapPreviewPin} pointerEvents="none">
                <View style={[styles.mapPreviewPinCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="location" size={24} color={colors.text.white} />
                </View>
                <View style={[styles.mapPreviewPinStem, { backgroundColor: colors.primary }]} />
              </View>

              <View style={styles.mapPreviewOverlay}>
                <View style={[styles.mapPreviewExpandButton, { backgroundColor: colors.primary }]}>
                  <Ionicons name="expand" size={16} color={colors.text.white} />
                  <Text style={styles.mapPreviewExpandText}>{t('tapToExpandMap')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.internationalConfirmButton, {
                backgroundColor: markerCoordinate ? colors.primary : colors.border,
              }]}
              onPress={async () => {
                if (markerCoordinate) {
                  await reverseGeocode(markerCoordinate.latitude, markerCoordinate.longitude);
                }
              }}
              disabled={!markerCoordinate || isLoadingLocation}
            >
              {isLoadingLocation ? (
                <>
                  <ActivityIndicator size="small" color={colors.text.white} />
                  <Text style={[styles.internationalConfirmText, {
                    color: markerCoordinate ? colors.text.white : colors.text.light
                  }]}>
                    {t('gettingAddress')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={markerCoordinate ? colors.text.white : colors.text.light} />
                  <Text style={[styles.internationalConfirmText, {
                    color: markerCoordinate ? colors.text.white : colors.text.light
                  }]}>
                    {streetAddress ? t('updateLocation') : t('confirmAndGetAddress')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {streetAddress && (
            <View style={[styles.addressConfirmedCard, {
              backgroundColor: isDarkMode ? colors.surfaceVariant : '#ECFDF5',
              borderColor: colors.success,
            }]}>
              <View style={styles.addressConfirmedHeader}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.addressConfirmedTitle}>{t('locationConfirmed')}</Text>
              </View>
              <Text style={[styles.addressConfirmedText, { color: colors.text.primary }]}>
                {[streetAddress, city, postalCode].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Detailed Address Entry Form */}
          <View style={styles.internationalFormSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text.primary }]}>
              {t('addressDetails')}
            </Text>

            {/* Label Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('labelAs')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {labels.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.labelButton,
                      label === l.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setLabel && setLabel(l.id)}
                  >
                    <Ionicons
                      name={l.icon}
                      size={18}
                      color={label === l.id ? colors.text.white : colors.text.secondary}
                    />
                    <Text style={[
                      styles.labelButtonText,
                      label === l.id && { color: colors.text.white, fontWeight: '600' }
                    ]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('streetAddress')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: fieldErrors.streetAddress ? colors.error : colors.border,
              }]}>
                <Ionicons name="home-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="House 32, Road 14"
                  placeholderTextColor={colors.text.light}
                  value={streetAddress}
                  onChangeText={(text) => {
                    setStreetAddress(text);
                    clearFieldError('streetAddress');
                  }}
                />
              </View>
              {fieldErrors.streetAddress && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.internationalErrorText}>{fieldErrors.streetAddress}</Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('buildingApartmentFloor')}
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: colors.border,
              }]}>
                <Ionicons name="business-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="Apartment 4B, 2nd Floor"
                  placeholderTextColor={colors.text.light}
                  value={detailedAddress}
                  onChangeText={(text) => {
                    setDetailedAddress(text);
                  }}
                />
              </View>
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('city')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: fieldErrors.city ? colors.error : colors.border,
              }]}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="Dhaka"
                  placeholderTextColor={colors.text.light}
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    clearFieldError('city');
                  }}
                />
              </View>
              {fieldErrors.city && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.internationalErrorText}>{fieldErrors.city}</Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('postalCodeZipCode')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: fieldErrors.postalCode ? colors.error : colors.border,
              }]}>
                <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="10001"
                  placeholderTextColor={colors.text.light}
                  value={postalCode}
                  onChangeText={(text) => {
                    setPostalCode(text);
                    clearFieldError('postalCode');
                  }}
                  keyboardType="default"
                />
              </View>
              {fieldErrors.postalCode && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.internationalErrorText}>{fieldErrors.postalCode}</Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('state')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: fieldErrors.state ? colors.error : colors.border,
              }]}>
                <Ionicons name="map-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="Dhaka Division"
                  placeholderTextColor={colors.text.light}
                  value={state}
                  onChangeText={(text) => {
                    setState(text);
                    clearFieldError('state');
                  }}
                />
              </View>
              {fieldErrors.state && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.internationalErrorText}>{fieldErrors.state}</Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text style={[styles.internationalFieldLabel, { color: colors.text.primary }]}>
                {t('country')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.internationalInput, {
                borderColor: fieldErrors.country ? colors.error : colors.border,
              }]}>
                <Ionicons name="globe-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.internationalInputText, { color: colors.text.primary }]}
                  placeholder="Bangladesh"
                  placeholderTextColor={colors.text.light}
                  value={country}
                  onChangeText={(text) => {
                    setCountry(text);
                    clearFieldError('country');
                  }}
                />
              </View>
              {fieldErrors.country && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.internationalErrorText}>{fieldErrors.country}</Text>
                </View>
              )}
            </View>

            {markerCoordinate && (
              <View style={[styles.gpsCoordinatesCard, {
                backgroundColor: isDarkMode ? colors.surfaceVariant : '#F0F9FF',
                borderColor: colors.primary,
              }]}>
                <View style={styles.gpsCoordinatesHeader}>
                  <Ionicons name="navigate-circle" size={20} color={colors.primary} />
                  <Text style={styles.gpsCoordinatesLabel}>{t('gpsCoordinates')}</Text>
                </View>
                <Text style={styles.gpsCoordinatesValue}>
                  Lat: {markerCoordinate.latitude.toFixed(7)}, Lng: {markerCoordinate.longitude.toFixed(7)}
                </Text>
                <View style={styles.gpsCoordinatesStatus}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.gpsCoordinatesStatusText}>{t('verified')}</Text>
                </View>
              </View>
            )}
          </View>



          {/* Saved Addresses List */}
          {savedAddresses && savedAddresses.length > 0 && (
            <View style={styles.savedAddressesSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text.primary, paddingHorizontal: 16, marginBottom: 16 }]}>
                {t('savedAddresses')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={styles.savedAddressCard}
                    onPress={() => onSelectAddress && onSelectAddress(addr)}
                  >
                    <View style={[styles.savedAddressIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons
                        name={(addr.label === 'Work' || addr.label === t('work')) ? 'briefcase' : (addr.label === 'Other' || addr.label === t('other')) ? 'location' : 'home'}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.savedAddressLabel, { color: colors.text.primary }]}>{addr.label}</Text>
                      <Text style={styles.savedAddressText} numberOfLines={2}>{addr.address}</Text>
                      <Text style={styles.savedAddressSubText} numberOfLines={1}>{addr.city}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )
      }
    </View >
  );
};



export default LocationDetails;
