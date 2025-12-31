
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import StorageService from '../utils/storage';
import { useProfile } from './ProfileContext';

const STORAGE_KEY_LOCATION = 'deligo_user_location';
const STORAGE_KEY_SAVED_ADDRESSES = 'deligo_saved_addresses';

export const LocationContext = createContext(null);

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [detailedAddress, setDetailedAddress] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [label, setLabel] = useState('Home');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { isAuthenticated } = useProfile();
    const prevAuthRef = useRef(isAuthenticated);

    // Load saved addresses and last known location on mount
    useEffect(() => {
        const init = async () => {
            loadStoredLocationData();
            // Permissions are now handled in PermissionsScreen
        };
        init();
    }, []);

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
        } catch (err) {
            console.warn('Failed to load location data:', err);
        }
    };

    const getCurrentLocation = async () => {
        setLoading(true);
        setError(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permission to access location was denied');
                setLoading(false);
                return null;
            }

            let loc = await Location.getCurrentPositionAsync({});

            // Reverse geocode
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

                // Comprehensive address construction matching other screens
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

            // We don't automatically save this as the "selected" address unless confirmed,
            // but for now we update the state to reflect the current fetched location
            setCurrentLocation(loc.coords);
            setAddress(mainAddress);
            setCity(locCity);
            setPostalCode(locPostalCode);
            setState(locState);
            setCountry(locCountry);

            return locationData;
        } catch (err) {
            console.error('Error getting location:', err);
            setError('Error getting location');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const saveAddress = async (newAddressData) => {
        try {
            // newAddressData: { address, detailedAddress, city, postalCode, state, country, label, coordinates }
            const newAddress = {
                id: Date.now().toString(), // Simple ID generation
                ...newAddressData
            };

            const updatedAddresses = [...savedAddresses, newAddress];
            setSavedAddresses(updatedAddresses);
            await StorageService.setItem(STORAGE_KEY_SAVED_ADDRESSES, updatedAddresses);

            // Also set as current active address
            // Also set as current active address
            setAddress(newAddress.address);
            setDetailedAddress(newAddress.detailedAddress);
            setCity(newAddress.city);
            setPostalCode(newAddress.postalCode);
            setState(newAddress.state || '');
            setCountry(newAddress.country || '');
            setLabel(newAddress.label);
            setCurrentLocation(newAddress.coordinates);

            await StorageService.setItem(STORAGE_KEY_LOCATION, newAddress);

            return true;
        } catch (err) {
            console.error('Error saving address:', err);
            return false;
        }
    };

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

    const deleteAddress = async (addressId) => {
        const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId);
        setSavedAddresses(updatedAddresses);
        await StorageService.setItem(STORAGE_KEY_SAVED_ADDRESSES, updatedAddresses);
    };

    const clearUserData = async () => {
        setSavedAddresses([]);
        setLabel('Home');
        try {
            await StorageService.removeItem(STORAGE_KEY_SAVED_ADDRESSES);
        } catch (e) {
            console.warn('Failed to clear saved addresses:', e);
        }
    };

    useEffect(() => {
        if (prevAuthRef.current && !isAuthenticated) {
            console.log('[LocationContext] User logged out, clearing user data');
            clearUserData();
        }
        prevAuthRef.current = isAuthenticated;
    }, [isAuthenticated]);

    return (
        <LocationContext.Provider value={{
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
            getCurrentLocation,
            saveAddress,
            selectAddress,
            deleteAddress,
            setAddress, // Expose setters for manual input
            setDetailedAddress,
            setCity,
            setPostalCode,
            setState,
            setCountry,
            setLabel,
            clearUserData
        }}>
            {children}
        </LocationContext.Provider>
    );
};
