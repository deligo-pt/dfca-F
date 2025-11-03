import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const LOGO = require('../assets/images/logo.png');

const LocationAddressScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [label, setLabel] = useState('Home');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);

      // Reverse geocode
      let addresses = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const mainAddress = [addr.street, addr.city, addr.region]
          .filter(Boolean)
          .join(', ');
        setAddress(mainAddress);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Error getting location');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = () => {
    if (!address.trim()) {
      alert('Please enter an address');
      return;
    }

    // Pass back the address to the previous screen
    if (route.params?.onSave) {
      route.params.onSave({
        address,
        detailedAddress,
        label,
        coordinates: currentLocation,
      });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles(colors).safeArea} edges={['top']}>
      {/* Logo Section */}
      {/*<View style={styles(colors).logoContainer}>*/}
      {/*  <Image source={LOGO} style={styles(colors).logoImage} resizeMode="contain" />*/}
      {/*</View>*/}

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles(colors).backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Add Delivery Address</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles(colors).currentLocationButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          <Text style={styles(colors).locationIcon}>📍</Text>
          <View style={styles(colors).currentLocationText}>
            <Text style={styles(colors).currentLocationTitle}>Use current location</Text>
            <Text style={styles(colors).currentLocationSubtitle}>
              Enable your GPS for better accuracy
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles(colors).arrow}>→</Text>
          )}
        </TouchableOpacity>

        {/* Map Placeholder */}
        <View style={styles(colors).mapPlaceholder}>
          <Text style={styles(colors).mapIcon}>🗺️</Text>
          <Text style={styles(colors).mapText}>
            {currentLocation
              ? `Lat: ${currentLocation.latitude.toFixed(4)}, Lng: ${currentLocation.longitude.toFixed(4)}`
              : 'Tap to select location on map'}
          </Text>
        </View>

        {/* Address Input */}
        <View style={styles(colors).inputSection}>
          <Text style={styles(colors).label}>Address *</Text>
          <TextInput
            style={styles(colors).input}
            placeholder="e.g., 123 Main Street, City"
            placeholderTextColor={colors.text.light}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Detailed Address Input */}
        <View style={styles(colors).inputSection}>
          <Text style={styles(colors).label}>Apartment / Building (Optional)</Text>
          <TextInput
            style={styles(colors).input}
            placeholder="e.g., Apt 4B, Floor 2"
            placeholderTextColor={colors.text.light}
            value={detailedAddress}
            onChangeText={setDetailedAddress}
          />
        </View>

        {/* Address Label */}
        <View style={styles(colors).inputSection}>
          <Text style={styles(colors).label}>Label as *</Text>
          <View style={styles(colors).labelButtons}>
            <TouchableOpacity
              style={[styles(colors).labelButton, label === 'Home' && styles(colors).labelButtonActive]}
              onPress={() => setLabel('Home')}
            >
              <Text style={[styles(colors).labelButtonText, label === 'Home' && styles(colors).labelButtonTextActive]}>
                🏠 Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(colors).labelButton, label === 'Work' && styles(colors).labelButtonActive]}
              onPress={() => setLabel('Work')}
            >
              <Text style={[styles(colors).labelButtonText, label === 'Work' && styles(colors).labelButtonTextActive]}>
                💼 Work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(colors).labelButton, label === 'Other' && styles(colors).labelButtonActive]}
              onPress={() => setLabel('Other')}
            >
              <Text style={[styles(colors).labelButtonText, label === 'Other' && styles(colors).labelButtonTextActive]}>
                📍 Other
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Addresses */}
        <View style={styles(colors).savedSection}>
          <Text style={styles(colors).savedTitle}>Saved Addresses</Text>
          <View style={styles(colors).savedItem}>
            <Text style={styles(colors).savedIcon}>🏠</Text>
            <View style={styles(colors).savedInfo}>
              <Text style={styles(colors).savedLabel}>Home</Text>
              <Text style={styles(colors).savedAddress}>123 Example St, City</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles(colors).savedAction}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles(colors).footer}>
        <TouchableOpacity
          style={[styles(colors).saveButton, !address.trim() && styles(colors).saveButtonDisabled]}
          onPress={handleSaveAddress}
          disabled={!address.trim()}
        >
          <Text style={styles(colors).saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  logoImage: {
    width: 500,
    height: 500,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text.primary,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  currentLocationText: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  currentLocationSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  arrow: {
    fontSize: 20,
    color: colors.text.light,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: colors.background === '#FFFFFF' ? '#F5F5F5' : '#1A1A1A',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mapText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    minHeight: 50,
  },
  labelButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  labelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  labelButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  labelButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
  },
  labelButtonTextActive: {
    color: colors.text.white,
  },
  savedSection: {
    marginTop: spacing.lg,
  },
  savedTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  savedIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  savedInfo: {
    flex: 1,
  },
  savedLabel: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  savedAddress: {
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  savedAction: {
    fontSize: 20,
    color: colors.text.light,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: colors.text.white,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
});

export default LocationAddressScreen;

