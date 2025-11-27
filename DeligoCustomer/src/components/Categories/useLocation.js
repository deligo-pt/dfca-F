import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useLanguage } from '../../utils/LanguageContext';

export default function useLocationHook(initialCoords = null) {
  const { t } = useLanguage();
  const [location, setLocation] = useState(initialCoords);
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
        setErrorMsg(t('locationDenied'));
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      let address = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (address && address.length > 0) {
        const addr = address[0];
        const areaString = [addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setArea(areaString || t('currentLocation'));
      } else {
        setArea(t('currentLocation'));
      }
    } catch (error) {
      setErrorMsg(t('errorGettingLocation'));
      setArea(t('setYourLocation'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return { location, area, loading, errorMsg, getLocation, setLocation, setArea };
}

