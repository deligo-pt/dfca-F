/**
 * LocationContext Provider
 *
 * Manages user location data, including current coordinates, resolved addresses,
 * and saved address lists. Handles persistence to local storage and integration
 * with native location services (via Expo Location).
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import StorageService from '../utils/storage';
import { useProfile } from './ProfileContext';

/**
 * Storage keys for persisting location state.
 */
const STORAGE_KEY_LOCATION = 'deligo_user_location';
const STORAGE_KEY_SAVED_ADDRESSES = 'deligo_saved_addresses';

export const LocationContext = createContext(null);

/**
 * Hook to access the LocationContext.
 * @returns {Object} The location context value.
 */
export const useLocation = () => useContext(LocationContext);

/**
 * LocationProvider Component
 * 
 * Provides location state and methods to the application.
 * Automatically loads persisted location data on mount.
 */
export const LocationProvider = ({ children }) => {
    // --- State Management ---
    const [currentLocation, setCurrentLocation] = useState(null); // { latitude, longitude }
    const [address, setAddress] = useState('');
    const [detailedAddress, setDetailedAddress] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [savedAddresses, setSavedAddresses] = useState([]);

    // UI/Metadata State
    const [label, setLabel] = useState('Home');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { isAuthenticated } = useProfile();
    const prevAuthRef = useRef(isAuthenticated);

    /**
     * Initialize location data from local storage on mount.
     * Permission is already granted in onboarding - just load/refresh location.
     */
    useEffect(() => {
        const init = async () => {
            // Respect in-app Location Services toggle FIRST
            const locationPref = await StorageService.getItem('location_enabled');
            if (locationPref === 'false') {
                console.log('[Location] Location Services disabled by user — skipping all location data.');
                // Clear any previously stored address from state so UI shows nothing
                setAddress('');
                setDetailedAddress('');
                setCity('');
                setPostalCode('');
                setState('');
                setCountry('');
                setCurrentLocation(null);
                return;
            }

            // Load stored location first for instant UI
            const hasLocation = await loadStoredLocationData();

            // If no stored coordinates, fetch fresh location (permission already granted)
            if (!hasLocation) {
                console.log('[Location] No stored coordinates, fetching fresh location...');
                await getCurrentLocation();
            }
        };
        init();
    }, []);

    /**
     * Loads saved addresses and the last selected location from storage.
     * @returns {Promise<boolean>} True if stored location was found.
     */
    const loadStoredLocationData = async () => {
        try {
            const storedLocation = await StorageService.getItem(STORAGE_KEY_LOCATION);
            const storedAddresses = await StorageService.getItem(STORAGE_KEY_SAVED_ADDRESSES);

            if (storedLocation) {
                setAddress(storedLocation.address || '');
                setDetailedAddress(storedLocation.detailedAddress || '');
                setCity(storedLocation.city || '');
                setPostalCode(storedLocation.postalCode || '');
                setState(storedLocation.state || '');
                setCountry(storedLocation.country || '');
                setCurrentLocation(storedLocation.coordinates || null);
                setLabel(storedLocation.label || 'Home');
            }

            if (storedAddresses && Array.isArray(storedAddresses)) {
                setSavedAddresses(storedAddresses);
            }

            // Return true if we had a valid stored location with coordinates
            return !!(storedLocation && storedLocation.coordinates);
        } catch (err) {
            console.warn('[Location] Failed to load stored data:', err);
            return false;
        }
    };

    /**
     * Requests permissions and retrieves the device's current location.
     * Performs reverse geocoding to determine address details from coordinates.
     * 
     * @returns {Promise<Object|null>} Location data object or null if failed/denied.
     */
    const getCurrentLocation = async () => {
        setLoading(true);
        setError(null);
        try {
            // Respect in-app Location Services toggle
            const locationPref = await StorageService.getItem('location_enabled');
            if (locationPref === 'false') {
                console.log('[Location] Location Services disabled by user — skipping.');
                setLoading(false);
                return null;
            }

            // Request permissions implicitly if not already granted
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permission to access location was denied');
                setLoading(false);
                return null;
            }

            // Strategy: 
            // 1. Try last known position (fast)
            // 2. Fallback to current position (slower but accurate)
            let loc = await Location.getLastKnownPositionAsync({});

            if (!loc) {
                // 'Balanced' accuracy is a good trade-off for speed/battery vs precision
                loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            }

            // Reverse Geocoding
            let addresses = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            let mainAddress = '';
            let locCity = '';
            let locPostalCode = '';
            let locState = '';
            let locCountry = '';

            if (addresses && addresses.length > 0) {
                const addr = addresses[0];

                // Construct a readable address string filtering out duplicates/empty values
                mainAddress = [
                    addr.district,
                    addr.street,
                    addr.name,
                    addr.subregion
                ].filter((val, index, self) => val && val.trim() !== '' && self.indexOf(val) === index).join(', ');

                locCity = addr.city || addr.region || addr.subregion || '';
                locPostalCode = addr.postalCode || '';
                locState = addr.region || addr.subregion || '';
                locCountry = addr.country || '';
            }

            const locationData = {
                coords: loc.coords,
                address: mainAddress,
                city: locCity,
                postalCode: locPostalCode,
                state: locState,
                country: locCountry
            };

            // Update local state with fetched data
            // Note: This does not auto-save as "selected" until confirmed by user action usually,
            // but this implementation updates the "current view" state immediately.
            setCurrentLocation(loc.coords);
            setAddress(mainAddress);
            setCity(locCity);
            setPostalCode(locPostalCode);
            setState(locState);
            setCountry(locCountry);

            return locationData;
        } catch (err) {
            console.error('[Location] Error getting current location:', err);
            // We log but don't set a hard error state that blocks the UI permanently
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Saves a new address to the saved addresses list and updates storage.
     * Also sets it as the currently active address.
     * 
     * @param {Object} newAddressData - The address details to save.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    const saveAddress = async (newAddressData) => {
        try {
            const newAddress = {
                id: Date.now().toString(),
                ...newAddressData
            };

            const updatedAddresses = [...savedAddresses, newAddress];
            setSavedAddresses(updatedAddresses);
            await StorageService.setItem(STORAGE_KEY_SAVED_ADDRESSES, updatedAddresses);

            // Set as current active address
            setAddress(newAddress.address);
            setDetailedAddress(newAddress.detailedAddress);
            setCity(newAddress.city);
            setPostalCode(newAddress.postalCode);
            setState(newAddress.state || '');
            setCountry(newAddress.country || '');
            setLabel(newAddress.label);
            setCurrentLocation(newAddress.coordinates);

            // Persist as the active location
            await StorageService.setItem(STORAGE_KEY_LOCATION, newAddress);

            return true;
        } catch (err) {
            console.error('[Location] Error saving address:', err);
            return false;
        }
    };

    /**
     * Selects an existing address from the saved list as the active location.
     * 
     * @param {Object} selectedAddress - The address object to select.
     */
    const selectAddress = async (selectedAddress) => {
        setAddress(selectedAddress.address);
        setDetailedAddress(selectedAddress.detailedAddress || '');
        setCity(selectedAddress.city || '');
        setPostalCode(selectedAddress.postalCode || '');
        setState(selectedAddress.state || '');
        setCountry(selectedAddress.country || '');
        setLabel(selectedAddress.label || 'Home');
        setCurrentLocation(selectedAddress.coordinates);

        await StorageService.setItem(STORAGE_KEY_LOCATION, selectedAddress);
    };

    /**
     * Deletes an address from the saved list.
     * 
     * @param {string} addressId - ID of the address to remove.
     */
    const deleteAddress = async (addressId) => {
        const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId);
        setSavedAddresses(updatedAddresses);
        await StorageService.setItem(STORAGE_KEY_SAVED_ADDRESSES, updatedAddresses);
    };

    /**
     * Clears all user-specific location data from state and storage.
     * Usually called on logout.
     */
    const clearUserData = async () => {
        setSavedAddresses([]);
        setLabel('Home');
        try {
            await StorageService.removeItem(STORAGE_KEY_SAVED_ADDRESSES);
        } catch (e) {
            console.warn('[Location] Failed to clear saved addresses:', e);
        }
    };

    // Handle auto-clear on logout
    useEffect(() => {
        if (prevAuthRef.current && !isAuthenticated) {
            console.log('[Location] User logged out, clearing user data');
            clearUserData();
        }
        prevAuthRef.current = isAuthenticated;
    }, [isAuthenticated]);

    return (
        <LocationContext.Provider value={{
            // State
            currentLocation,
            address,
            detailedAddress,
            city,
            postalCode,
            state,
            country,
            label,
            savedAddresses,
            loading,
            error,
            // Actions
            getCurrentLocation,
            saveAddress,
            selectAddress,
            deleteAddress,
            clearUserData,
            // Setters (Exposed for manual input forms)
            setAddress,
            setDetailedAddress,
            setCity,
            setPostalCode,
            setState,
            setCountry,
            setLabel,
        }}>
            {children}
        </LocationContext.Provider>
    );
};
