/**
 * ProfileContext Provider
 *
 * Manages user authentication and profile state.
 * Handles login, logout, profile updates, and onboarding status.
 * Interacts with AuthService for persistence and API calls.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService, { logoutUser as apiLogout } from '../utils/auth';

export const ProfileContext = createContext(null);

/**
 * Hook to access the ProfileContext.
 * @returns {Object} The profile context value.
 */
export const useProfile = () => useContext(ProfileContext);

/**
 * ProfileProvider Component
 * 
 * Provides global user state and authentication methods.
 */
export const ProfileProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

    // Rate Limiting Refs
    const isFetchingRef = React.useRef(false);
    const lastFetchedRef = React.useRef(0);
    const FETCH_THRESHOLD_MS = 60000; // 60 seconds

    /**
     * Checks the current authentication and onboarding status from storage.
     * Called on mount.
     */
    const checkAuthStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            // Check onboarding
            const onboardingStatus = await AuthService.getOnboardingStatus();
            setIsOnboardingCompleted(!!onboardingStatus);

            const authenticated = await AuthService.isAuthenticated();
            if (authenticated) {
                const userData = await AuthService.getUser();
                setUser(userData);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('[ProfileContext] Error checking auth status:', error);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial check
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    /**
     * Logs the user in and updates local state.
     * 
     * @param {Object} userData - User profile data.
     * @param {string} token - Access token.
     * @returns {Promise<boolean>} True if successful.
     */
    const login = async (userData, token) => {
        try {
            // Persist session via AuthService
            await AuthService.login(userData, token);
            setUser(userData);
            setIsAuthenticated(true);
            lastFetchedRef.current = Date.now(); // Mark as fresh
            return true;
        } catch (error) {
            console.error('[ProfileContext] Login failed:', error);
            return false;
        }
    };

    /**
     * Logs the user out, clearing state and storage.
     */
    const logout = async () => {
        try {
            let fcmToken = null;
            // Remove FCM token first
            try {
                const { default: firebaseNotificationService } = await import('../services/firebaseNotificationService');
                // Get token to send to backend before deleting
                fcmToken = await firebaseNotificationService.getStoredToken();
                if (!fcmToken) {
                    fcmToken = await firebaseNotificationService.getToken();
                }

                await firebaseNotificationService.deleteToken();
            } catch (fcmError) {
                console.warn('[ProfileContext] Failed to handle FCM token:', fcmError);
            }

            await apiLogout(null, fcmToken); // Calls backend and clears storage
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('[ProfileContext] Logout failed:', error);
            // Force local cleanup even if API fails
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    /**
     * Updates user profile data on the server.
     * Handles multipart/form-data for image uploads and specific field exclusions.
     * 
     * @param {Object} updatedData - Object containing fields to update.
     * @param {Object} [imageFile] - Optional image file object { uri, type, name }.
     * @returns {Promise<boolean>} True if successful.
     * @throws {Error} If update fails, with user-friendly message.
     */
    const updateProfile = async (updatedData, imageFile = null) => {
        try {
            const { customerApi } = await import('../utils/api');
            const { API_ENDPOINTS } = await import('../constants/config').then(m => m.default || m);

            // Clone data to avoid mutating original object
            const dataToUpdate = { ...updatedData };

            // Logic: Prevent updating immutable fields via this endpoint if needed, but allow contactNumber as requested
            // delete dataToUpdate.contactNumber; // Removed restriction to allow updates
            delete dataToUpdate.profilePhoto; // Handled separately as file

            console.log(`[${new Date().toISOString()}] [ProfileContext] updateProfile called with:`, JSON.stringify(dataToUpdate));

            const userId = user?.userId || user?._id || user?.id;
            if (!userId) {
                throw new Error('User ID not found. Please log in again.');
            }

            // Note: /profile endpoint uses auth token, no userId needed in URL
            const updateUrl = API_ENDPOINTS.PROFILE.UPDATE;
            let response;

            // Decision: Always use FormData as backend requires 'data' field with JSON string
            // Prepare FormData for multipart upload
            const formData = new FormData();
            const jsonPayload = JSON.stringify(dataToUpdate);
            formData.append('data', jsonPayload);

            // DEBUG: Log exactly what we're sending
            console.log(`[ProfileContext] DEBUG - FormData 'data' field content:`, jsonPayload);
            console.log(`[ProfileContext] DEBUG - NIF in payload:`, dataToUpdate.NIF || dataToUpdate.nif || 'NOT FOUND');
            console.log(`[ProfileContext] DEBUG - Update URL:`, updateUrl);

            // Attach image file if valid
            if (imageFile && imageFile.uri && !imageFile.uri.startsWith('http')) {
                formData.append('file', {
                    uri: imageFile.uri,
                    type: imageFile.type || 'image/jpeg',
                    name: imageFile.name || `profile-${Date.now()}.jpg`
                });
            }

            response = await customerApi.patch(updateUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            // DEBUG: Log the FULL response structure
            console.log(`[ProfileContext] DEBUG - Full API Response:`, JSON.stringify(response, null, 2));
            console.log(`[ProfileContext] DEBUG - response.data:`, JSON.stringify(response?.data, null, 2));

            const updatedUser = response?.data?.data || response?.data || response;

            console.log(`[${new Date().toISOString()}] [ProfileContext] updateProfile response:`, JSON.stringify(updatedUser));
            console.log(`[ProfileContext] DEBUG - NIF in response:`, updatedUser?.NIF || updatedUser?.nif || 'NOT IN RESPONSE');

            if (updatedUser) {
                // Optimistic merge: Ensure critical fields like NIF are preserved locally
                // even if backend response is incomplete/lazy.
                const mergedUser = {
                    ...updatedUser,
                    ...(updatedData.NIF && { NIF: updatedData.NIF }),
                    ...(updatedData.nif && { nif: updatedData.nif }),
                    ...(updatedData.address && { address: updatedData.address })
                };

                console.log(`[${new Date().toISOString()}] [ProfileContext] Merged local user state:`, JSON.stringify(mergedUser));

                setUser(mergedUser);
                // Persist updated data to local storage
                await import('../utils/auth').then(mod => mod.saveUserData(mergedUser));
                lastFetchedRef.current = Date.now(); // Mark as fresh
                return true;
            } else {
                console.error('[ProfileContext] No data returned from update API');
                return false;
            }
        } catch (error) {
            console.error('[ProfileContext] Update profile failed:', error);

            // Error Handling Strategy:
            // Extract meaningful messages from backend errors (e.g. duplicate email/phone)
            if (error.response) {
                const data = error.response.data;

                // Handle MongoDB Duplicate Key Errors (Code 11000)
                if (data?.err?.code === 11000) {
                    const stack = data.err.stack || '';
                    if (stack.includes('contactNumber')) {
                        throw new Error('This mobile number is already in use by another account.');
                    } else if (stack.includes('email')) {
                        throw new Error('This email is already in use by another account.');
                    }
                    throw new Error('Account details already in use.');
                }

                if (data?.message) {
                    throw new Error(data.message);
                }
            }
            throw error;
        }
    };

    /**
     * Marks onboarding as complete.
     */
    const completeOnboarding = async () => {
        try {
            await AuthService.setOnboardingStatus('true');
            setIsOnboardingCompleted(true);
        } catch (error) {
            console.error('[ProfileContext] completeOnboarding failed:', error);
        }
    };

    /**
     * Fetches the fresh user profile from the server.
     * Updates local state and storage.
     * 
     * @returns {Promise<Object|null>} The user object or null if failed.
     */
    /**
     * Fetches the fresh user profile from the server.
     * Updates local state and storage.
     * @param {boolean} force - If true, bypasses the throttle.
     * @returns {Promise<Object|null>} The user object or null if failed.
     */
    const fetchUserProfile = useCallback(async (force = false) => {
        // Concurrency Check
        if (isFetchingRef.current) {
            console.debug('[ProfileContext] Profile fetch in progress, skipping.');
            return null;
        }

        // Rate Limiting Check
        const now = Date.now();
        if (!force && (now - lastFetchedRef.current < FETCH_THRESHOLD_MS)) {
            console.debug(`[ProfileContext] Profile fetch throttled. Last fetch ${now - lastFetchedRef.current}ms ago.`);
            return user; // Return current local user
        }

        isFetchingRef.current = true;
        try {
            const { customerApi } = await import('../utils/api');
            const { API_ENDPOINTS } = await import('../constants/config').then(m => m.default || m);

            const response = await customerApi.get(API_ENDPOINTS.PROFILE.GET);
            const userData = response?.data || response;

            if (userData) {
                console.log('[ProfileContext] Fetched fresh user profile:', userData?.name || userData?.firstName);
                setUser(userData);
                await import('../utils/auth').then(mod => mod.saveUserData(userData));
                lastFetchedRef.current = Date.now();
                return userData;
            }
        } catch (error) {
            console.error('[ProfileContext] Failed to fetch user profile:', error);
        } finally {
            isFetchingRef.current = false;
        }
        return null;
    }, [user]);

    return (
        <ProfileContext.Provider value={{
            user,
            isAuthenticated,
            isLoading,
            isOnboardingCompleted,
            login,
            logout,
            updateProfile,
            checkAuthStatus,
            completeOnboarding,
            fetchUserProfile,
            setUserData: async (data) => {
                setUser(data);
                await import('../utils/auth').then(mod => mod.saveUserData(data));
            }
        }}>
            {children}
        </ProfileContext.Provider>
    );
};
