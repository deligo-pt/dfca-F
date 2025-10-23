import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const LocationAddressScreen = ({ navigation, route }) => {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Delivery Address</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.currentLocationText}>
            <Text style={styles.currentLocationTitle}>Use current location</Text>
            <Text style={styles.currentLocationSubtitle}>
              Enable your GPS for better accuracy
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.arrow}>→</Text>
          )}
        </TouchableOpacity>

        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapText}>
            {currentLocation
              ? `Lat: ${currentLocation.latitude.toFixed(4)}, Lng: ${currentLocation.longitude.toFixed(4)}`
              : 'Tap to select location on map'}
          </Text>
        </View>

        {/* Address Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 123 Main Street, City"
            placeholderTextColor={colors.text.light}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Detailed Address Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Apartment / Building (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Apt 4B, Floor 2"
            placeholderTextColor={colors.text.light}
            value={detailedAddress}
            onChangeText={setDetailedAddress}
          />
        </View>

        {/* Address Label */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Label as *</Text>
          <View style={styles.labelButtons}>
            <TouchableOpacity
              style={[styles.labelButton, label === 'Home' && styles.labelButtonActive]}
              onPress={() => setLabel('Home')}
            >
              <Text style={[styles.labelButtonText, label === 'Home' && styles.labelButtonTextActive]}>
                🏠 Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.labelButton, label === 'Work' && styles.labelButtonActive]}
              onPress={() => setLabel('Work')}
            >
              <Text style={[styles.labelButtonText, label === 'Work' && styles.labelButtonTextActive]}>
                💼 Work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.labelButton, label === 'Other' && styles.labelButtonActive]}
              onPress={() => setLabel('Other')}
            >
              <Text style={[styles.labelButtonText, label === 'Other' && styles.labelButtonTextActive]}>
                📍 Other
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Addresses */}
        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>Saved Addresses</Text>
          <View style={styles.savedItem}>
            <Text style={styles.savedIcon}>🏠</Text>
            <View style={styles.savedInfo}>
              <Text style={styles.savedLabel}>Home</Text>
              <Text style={styles.savedAddress}>123 Example St, City</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.savedAction}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !address.trim() && styles.saveButtonDisabled]}
          onPress={handleSaveAddress}
          disabled={!address.trim()}
        >
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.background,
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
    backgroundColor: '#F5F5F5',
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  labelButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    color: colors.text.white,
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
  },
});

export default LocationAddressScreen;

