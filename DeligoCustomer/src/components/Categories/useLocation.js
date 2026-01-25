import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useLanguage } from '../../utils/LanguageContext';

/**
 * useLocation Hook
 * 
 * Manages user geolocation state and permissions.
 * Performs reverse geocoding to provide human-readable location addresses.
 * Handles permission denials and loading states.
 * 
 * @param {Object} [initialCoords] - Optional predefined coordinates to initialize state.
 * @returns {Object} Location control object including state and retrial functions.
 */
export default function useLocationHook(initialCoords = null) {
  const { t } = useLanguage();
  const [location, setLocation] = useState(initialCoords);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState(null);

  /**
   * Request permissions and fetching current location
   */
  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setArea(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(t('locationDenied'));
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (address && address.length > 0) {
        const addr = address[0];
        const areaString = [addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setArea(areaString || t('currentLocation'));
      } else {
        setArea(t('currentLocation'));
      }

    } catch (error) {
      console.error('[useLocation] Error fetching location:', error);
      setErrorMsg(t('errorGettingLocation'));
      setArea(t('setYourLocation'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return {
    location,
    area,
    loading,
    errorMsg,
    getLocation,
    setLocation,
    setArea
  };
}

