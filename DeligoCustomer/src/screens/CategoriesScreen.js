import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../theme';

const CategoriesScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState(null);

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setArea(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      // Reverse geocode to get area name
      let address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address && address.length > 0) {
        const addr = address[0];
        setArea(
          [addr.name, addr.street, addr.city, addr.region, addr.country]
            .filter(Boolean)
            .join(', ')
        );
      } else {
        setArea('Area not found');
      }
    } catch (error) {
      setErrorMsg('Error getting location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome to Deligo!</Text>
        <Text style={styles.subText}>Your food delivery app</Text>

        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Text style={styles.buttonText}>Refresh Location</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {location && !loading && !errorMsg && (
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>Latitude: {location.latitude}</Text>
            <Text style={styles.locationText}>Longitude: {location.longitude}</Text>
            {area && <Text style={styles.locationText}>Area: {area}</Text>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  subText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: 40,
    fontFamily: 'Poppins-Regular',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    fontFamily: 'Poppins-Regular',
  },
  locationBox: {
    marginTop: 30,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: 'Poppins-Regular',
  },
});

export default CategoriesScreen;
