import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import { useAppDispatch, useAppSelector } from "../../store/store";

const LocationDetails = ({
  // Boolean/State defaults
  isMapFullScreen = false,
  isLoadingLocation = false,
  locationPermission = true,

  // Setters (Functions must default to empty function to avoid crashes)
  setIsMapFullScreen = () => {},
  setMapRegion = () => {},
  setMarkerCoordinate = () => {},
  setSearchLocation = () => {},
  setStreetAddress = () => {},
  setStreetNumber = () => {},
  setCity = () => {},
  setPostalCode = () => {},
  clearFieldError = () => {},
  getCurrentLocation = () => {},
  searchAddress = () => {},
  reverseGeocode = () => {},

  // Data/Value defaults
  mapRegion = {
    latitude: 23.7648, // Tejgaon, Dhaka
    longitude: 90.4078, // Tejgaon, Dhaka
    latitudeDelta: 0.02, // Zoomed in nicely (you can adjust)
    longitudeDelta: 0.02,
  },
  markerCoordinate = null, // Use null or a safe initial coordinate
  searchLocation = "",
  streetAddress = "",
  streetNumber = "",
  city = "",
  postalCode = "",

  // Complex object defaults
  fieldErrors = {},
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const region = useAppSelector((state) => state.map.mapRegion);
  console.log("region: ", region);

  return (
    <View style={styles.professionalLocationWrapper}>
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
            showsCompass={true}
            showsBuildings={true}
            showsPointsOfInterest={true}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
          />

          <View style={styles.fullScreenPin} pointerEvents="none">
            <View
              style={[
                styles.fullScreenPinCircle,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="business" size={22} color="#fff" />
            </View>
            <View
              style={[
                styles.fullScreenPinStem,
                { backgroundColor: colors.primary },
              ]}
            />
            <View style={styles.fullScreenPinShadow} />
          </View>

          <View style={styles.fullScreenControls}>
            <TouchableOpacity
              style={[styles.fullScreenButton, { backgroundColor: "#fff" }]}
              onPress={() => setIsMapFullScreen(false)}
            >
              <Ionicons name="contract" size={20} color={colors.primary} />
              <Text
                style={[styles.fullScreenButtonText, { color: colors.primary }]}
              >
                Exit Full Screen
              </Text>
            </TouchableOpacity>

            <View style={styles.fullScreenRightControls}>
              <TouchableOpacity
                style={[
                  styles.fullScreenIconButton,
                  { backgroundColor: "#fff" },
                ]}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="navigate" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>

              <View style={styles.fullScreenZoomButtons}>
                <TouchableOpacity
                  style={[
                    styles.fullScreenIconButton,
                    { backgroundColor: "#fff", marginBottom: 8 },
                  ]}
                  onPress={() => {
                    setMapRegion({
                      ...mapRegion,
                      latitudeDelta: mapRegion.latitudeDelta / 2,
                      longitudeDelta: mapRegion.longitudeDelta / 2,
                    });
                  }}
                >
                  <Ionicons name="add" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.fullScreenIconButton,
                    { backgroundColor: "#fff" },
                  ]}
                  onPress={() => {
                    setMapRegion({
                      ...mapRegion,
                      latitudeDelta: mapRegion.latitudeDelta * 2,
                      longitudeDelta: mapRegion.longitudeDelta * 2,
                    });
                  }}
                >
                  <Ionicons name="remove" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.fullScreenConfirmContainer}>
            <TouchableOpacity
              style={[
                styles.fullScreenConfirmButton,
                {
                  backgroundColor: markerCoordinate
                    ? colors.primary
                    : "#CCCCCC",
                },
              ]}
              onPress={async () => {
                if (markerCoordinate) {
                  await reverseGeocode(
                    markerCoordinate.latitude,
                    markerCoordinate.longitude
                  );
                  setIsMapFullScreen(false);
                }
              }}
              disabled={!markerCoordinate || isLoadingLocation}
            >
              {isLoadingLocation ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.fullScreenConfirmText}>
                    Getting Address...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.fullScreenConfirmText}>
                    Confirm Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!isMapFullScreen && (
        <ScrollView
          style={styles.professionalScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.professionalScrollContent}
        >
          <Text
            style={[
              styles.internationalFieldLabel,
              {
                color: colors.text.primary,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginBottom: 0,
              },
            ]}
          >
            {t("Location")}
          </Text>

          <View style={styles.internationalSearchContainer}>
            <View
              style={[
                styles.internationalSearchBar,
                { backgroundColor: "#fff", borderColor: "#E5E7EB" },
              ]}
            >
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={[
                  styles.internationalSearchInput,
                  { color: colors.text.primary },
                ]}
                placeholder="Search for your business address..."
                placeholderTextColor="#9CA3AF"
                value={searchLocation}
                onChangeText={setSearchLocation}
                onSubmitEditing={searchAddress}
                returnKeyType="search"
                editable={!isLoadingLocation}
              />
              {searchLocation.length > 0 ? (
                <View style={styles.searchBarActions}>
                  <TouchableOpacity
                    onPress={() => setSearchLocation("")}
                    style={styles.searchClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={searchAddress}
                    style={[
                      styles.searchGoButton,
                      { backgroundColor: colors.primary },
                    ]}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {isLoadingLocation && (
              <View style={styles.searchLoadingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.searchLoadingText,
                    { color: colors.text.secondary },
                  ]}
                >
                  Searching location...
                </Text>
              </View>
            )}
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: "#fff",
                  borderColor: colors.primary,
                },
              ]}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="navigate-circle"
                  size={20}
                  color={colors.primary}
                />
              )}
              <Text style={[styles.quickActionText, { color: colors.primary }]}>
                {isLoadingLocation ? "Locating..." : "Use GPS"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: "#fff",
                  borderColor: "#E5E7EB",
                },
              ]}
              onPress={() => setIsMapFullScreen(true)}
            >
              <Ionicons name="expand" size={20} color="#6B7280" />
              <Text style={[styles.quickActionText, { color: "#6B7280" }]}>
                Full Map
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
              />

              <View style={styles.mapPreviewPin} pointerEvents="none">
                <View
                  style={[
                    styles.mapPreviewPinCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="business" size={18} color="#fff" />
                </View>
                <View
                  style={[
                    styles.mapPreviewPinStem,
                    { backgroundColor: colors.primary },
                  ]}
                />
              </View>

              <View style={styles.mapPreviewOverlay}>
                <View
                  style={[
                    styles.mapPreviewExpandButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="expand" size={18} color="#fff" />
                  <Text style={styles.mapPreviewExpandText}>
                    Tap to expand map
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.internationalConfirmButton,
                {
                  backgroundColor: markerCoordinate
                    ? colors.primary
                    : "#E5E7EB",
                },
              ]}
              onPress={async () => {
                if (markerCoordinate) {
                  await reverseGeocode(
                    markerCoordinate.latitude,
                    markerCoordinate.longitude
                  );
                }
              }}
              disabled={!markerCoordinate || isLoadingLocation}
            >
              {isLoadingLocation ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text
                    style={[
                      styles.internationalConfirmText,
                      {
                        color: markerCoordinate ? "#fff" : "#9CA3AF",
                      },
                    ]}
                  >
                    Getting Address...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={markerCoordinate ? "#fff" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.internationalConfirmText,
                      {
                        color: markerCoordinate ? "#fff" : "#9CA3AF",
                      },
                    ]}
                  >
                    {streetAddress
                      ? "Update Location"
                      : "Confirm & Get Address"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {streetAddress && (
            <View
              style={[
                styles.addressConfirmedCard,
                {
                  backgroundColor: "#ECFDF5",
                  borderColor: "#10B981",
                },
              ]}
            >
              <View style={styles.addressConfirmedHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.addressConfirmedTitle}>
                  Location Confirmed
                </Text>
              </View>
              <Text style={styles.addressConfirmedText}>
                {[streetNumber, streetAddress, city, postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          )}

          <View style={styles.internationalFormSection}>
            <View style={styles.internationalFieldGroup}>
              <Text
                style={[
                  styles.internationalFieldLabel,
                  { color: colors.text.primary },
                ]}
              >
                Street Address <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View
                style={[
                  styles.internationalInput,
                  {
                    borderColor: fieldErrors.streetAddress
                      ? "#EF4444"
                      : "#E5E7EB",
                  },
                ]}
              >
                <Ionicons name="home-outline" size={20} color="#6B7280" />
                <TextInput
                  style={[
                    styles.internationalInputText,
                    { color: colors.text.primary },
                  ]}
                  placeholder="123 Main Street"
                  placeholderTextColor="#9CA3AF"
                  value={streetAddress}
                  onChangeText={(text) => {
                    setStreetAddress(text);
                    clearFieldError("streetAddress");
                  }}
                />
              </View>
              {fieldErrors.streetAddress && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.internationalErrorText}>
                    {fieldErrors.streetAddress}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text
                style={[
                  styles.internationalFieldLabel,
                  { color: colors.text.primary },
                ]}
              >
                Building / Suite Number
              </Text>
              <View
                style={[styles.internationalInput, { borderColor: "#E5E7EB" }]}
              >
                <Ionicons name="business-outline" size={20} color="#6B7280" />
                <TextInput
                  style={[
                    styles.internationalInputText,
                    { color: colors.text.primary },
                  ]}
                  placeholder="Building 123, Suite 456"
                  placeholderTextColor="#9CA3AF"
                  value={streetNumber}
                  onChangeText={setStreetNumber}
                  keyboardType="default"
                />
              </View>
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text
                style={[
                  styles.internationalFieldLabel,
                  { color: colors.text.primary },
                ]}
              >
                City <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View
                style={[
                  styles.internationalInput,
                  {
                    borderColor: fieldErrors.city ? "#EF4444" : "#E5E7EB",
                  },
                ]}
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <TextInput
                  style={[
                    styles.internationalInputText,
                    { color: colors.text.primary },
                  ]}
                  placeholder="New York"
                  placeholderTextColor="#9CA3AF"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    clearFieldError("city");
                  }}
                />
              </View>
              {fieldErrors.city && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.internationalErrorText}>
                    {fieldErrors.city}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.internationalFieldGroup}>
              <Text
                style={[
                  styles.internationalFieldLabel,
                  { color: colors.text.primary },
                ]}
              >
                Postal Code / ZIP Code{" "}
                <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View
                style={[
                  styles.internationalInput,
                  {
                    borderColor: fieldErrors.postalCode ? "#EF4444" : "#E5E7EB",
                  },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <TextInput
                  style={[
                    styles.internationalInputText,
                    { color: colors.text.primary },
                  ]}
                  placeholder="10001"
                  placeholderTextColor="#9CA3AF"
                  value={postalCode}
                  onChangeText={(text) => {
                    setPostalCode(text);
                    clearFieldError("postalCode");
                  }}
                  keyboardType="default"
                />
              </View>
              {fieldErrors.postalCode && (
                <View style={styles.internationalErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.internationalErrorText}>
                    {fieldErrors.postalCode}
                  </Text>
                </View>
              )}
            </View>

            {markerCoordinate && (
              <View
                style={[
                  styles.gpsCoordinatesCard,
                  {
                    backgroundColor: "#F0F9FF",
                    borderColor: "#3B82F6",
                  },
                ]}
              >
                <View style={styles.gpsCoordinatesHeader}>
                  <Ionicons name="navigate-circle" size={20} color="#3B82F6" />
                  <Text style={styles.gpsCoordinatesLabel}>
                    GPS Coordinates
                  </Text>
                </View>
                <Text style={styles.gpsCoordinatesValue}>
                  Lat: {markerCoordinate.latitude.toFixed(7)}, Lng:{" "}
                  {markerCoordinate.longitude.toFixed(7)}
                </Text>
                <View style={styles.gpsCoordinatesStatus}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.gpsCoordinatesStatusText}>Verified</Text>
                </View>
              </View>
            )}
          </View>

          <View
            style={[
              styles.professionalHelpCard,
              {
                backgroundColor: `${colors.primary}08`,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <View style={styles.professionalHelpContent}>
              <Text
                style={[
                  styles.professionalHelpTitle,
                  { color: colors.text.primary },
                ]}
              >
                Location Accuracy
              </Text>
              <Text
                style={[
                  styles.professionalHelpText,
                  { color: colors.text.secondary },
                ]}
              >
                Ensure your business address is accurate for seamless delivery
                operations and better customer reach.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  professionalLocationWrapper: {
    flex: 1,
  },
  professionalScrollView: {
    flex: 1,
  },
  professionalScrollContent: {
    paddingBottom: 30,
  },
  internationalSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  internationalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  internationalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginLeft: 10,
    marginRight: 10,
  },
  searchBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchClearButton: {
    padding: 4,
  },
  searchGoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchLoadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 8,
  },
  internationalMapPreview: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mapPreviewTouchable: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mapPreview: {
    width: "100%",
    height: 280,
  },
  mapPreviewPin: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  mapPreviewPinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#fff",
  },
  mapPreviewPinStem: {
    width: 3,
    height: 18,
    marginTop: -1,
  },
  mapPreviewOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    alignItems: "center",
  },
  mapPreviewExpandButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPreviewExpandText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
    marginLeft: 6,
  },
  internationalConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  internationalConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 8,
  },
  addressConfirmedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  addressConfirmedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  addressConfirmedTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    color: "#10B981",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  addressConfirmedText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#065F46",
    lineHeight: 20,
  },
  internationalFormSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  formSectionSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginBottom: 20,
  },
  internationalFieldGroup: {
    marginBottom: 16,
  },
  internationalFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },
  requiredMark: {
    color: "#EF4444",
  },
  internationalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  internationalInputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginLeft: 10,
  },
  internationalErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 2,
  },
  internationalErrorText: {
    fontSize: 12,
    color: "#EF4444",
    fontFamily: "Poppins-Regular",
    marginLeft: 4,
  },
  gpsCoordinatesCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  gpsCoordinatesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  gpsCoordinatesLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    color: "#3B82F6",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gpsCoordinatesValue: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#1E40AF",
    marginBottom: 8,
  },
  gpsCoordinatesStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  gpsCoordinatesStatusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
    marginLeft: 4,
  },
  professionalHelpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 4,
  },
  professionalHelpText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  fullScreenMapContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullScreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  fullScreenPin: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  fullScreenPinCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 4,
    borderColor: "#fff",
  },
  fullScreenPinStem: {
    width: 4,
    height: 24,
    marginTop: -1,
  },
  fullScreenPinShadow: {
    width: 28,
    height: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    marginTop: 8,
  },
  fullScreenControls: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 10,
  },
  fullScreenButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  fullScreenButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 8,
  },
  fullScreenRightControls: {
    alignItems: "flex-end",
  },
  fullScreenIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  fullScreenZoomButtons: {
    marginTop: 12,
  },
  fullScreenConfirmContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  fullScreenConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  fullScreenConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    color: "#fff",
    marginLeft: 10,
  },
});

export default LocationDetails;
