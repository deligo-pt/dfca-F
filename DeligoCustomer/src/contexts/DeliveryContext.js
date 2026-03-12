import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from './LocationContext';
import { formatMinutesToUX } from '../utils/timeFormat';

const DeliveryContext = createContext();

export const DeliveryProvider = ({ children }) => {
  const { currentLocation } = useLocation();
  // Keyed by vendorId → { estimate: number, timestamp: number }
  const [estimates, setEstimates] = useState({});

  const fetchEstimate = useCallback(async (vIdInput, lat, lon) => {
    if (!vIdInput || !lat || !lon || !currentLocation) return null;
    const vendorId = String(vIdInput);

    // 1. Check Cache (valid for 5 minutes)
    const cached = estimates[vendorId];
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.estimate;
    }

    // 2. Fetch from Google
    try {
      const GOOGLE_KEY = 'AIzaSyCZ1jixNYbSRM21Uq82a6KXNO_FSpLUwaQ';
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${currentLocation.latitude},${currentLocation.longitude}&destinations=${lat},${lon}&mode=driving&key=${GOOGLE_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      let finalMins = null;
      const el = data?.rows?.[0]?.elements?.[0];

      if (data.status === 'OK' && el?.status === 'OK') {
        const driveMin = Math.ceil(el.duration.value / 60);
        finalMins = driveMin + 10; // Standard 10 min prep
      } else {
        // Fallback: Haversine
        const R = 6371;
        const dLat = (lat - currentLocation.latitude) * (Math.PI / 180);
        const dLon = (lon - currentLocation.longitude) * (Math.PI / 180);
        const a = Math.sin(dLat/2)**2 + Math.cos(currentLocation.latitude*(Math.PI/180))*Math.cos(lat*(Math.PI/180))*Math.sin(dLon/2)**2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        finalMins = Math.max(10, Math.round(distKm * 3) + 10);
      }

      setEstimates(prev => ({
        ...prev,
        [vendorId]: { estimate: finalMins, timestamp: Date.now() }
      }));
      
      return finalMins;
    } catch (err) {
      console.error('[DeliveryContext] Fetch failed:', err);
      return null;
    }
  }, [currentLocation, estimates]);

  const getFormattedRange = useCallback((vIdInput, fallbackStr = '20 - 30 min') => {
    if (!vIdInput) return formatMinutesToUX(fallbackStr);
    const vendorId = String(vIdInput);
    
    const data = estimates[vendorId];
    if (!data || !data.estimate) {
        return formatMinutesToUX(fallbackStr);
    }
    
    const start = formatMinutesToUX(data.estimate);
    const end = formatMinutesToUX(data.estimate + 5);
    return start === end ? start : `${start} - ${end}`;
  }, [estimates]);

  return (
    <DeliveryContext.Provider value={{ fetchEstimate, getFormattedRange, estimates }}>
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) throw new Error('useDelivery must be used within a DeliveryProvider');
  return context;
};
