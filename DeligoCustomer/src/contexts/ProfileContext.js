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
            await apiLogout(); // Calls backend and clears storage
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

            // Security/Logic: Prevent updating sensitive or immutable fields via this endpoint
            delete dataToUpdate.contactNumber;
            delete dataToUpdate.profilePhoto; // Handled separately as file

            // Prepare FormData for multipart upload
            const formData = new FormData();
            formData.append('data', JSON.stringify(dataToUpdate));

            // Attach image file if valid
            if (imageFile && imageFile.uri && !imageFile.uri.startsWith('http')) {
                formData.append('file', {
                    uri: imageFile.uri,
                    type: imageFile.type || 'image/jpeg',
                    name: imageFile.name || `profile-${Date.now()}.jpg`
                });
            }

            const userId = user?.userId || user?._id || user?.id;
            if (!userId) {
                throw new Error('User ID not found. Please log in again.');
            }

            const updateUrl = API_ENDPOINTS.PROFILE.UPDATE.replace(':id', userId);

            const response = await customerApi.patch(updateUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            const updatedUser = response?.data || response;

            if (updatedUser) {
                setUser(updatedUser);
                // Persist updated data to local storage
                await import('../utils/auth').then(mod => mod.saveUserData(updatedUser));
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
    const fetchUserProfile = async () => {
        try {
            const { customerApi } = await import('../utils/api');
            const { API_ENDPOINTS } = await import('../constants/config').then(m => m.default || m);

            const response = await customerApi.get(API_ENDPOINTS.PROFILE.GET);
            const userData = response?.data || response;

            if (userData) {
                console.log('[ProfileContext] Fetched fresh user profile:', userData?.name || userData?.firstName);
                setUser(userData);
                await import('../utils/auth').then(mod => mod.saveUserData(userData));
                return userData;
            }
        } catch (error) {
            console.error('[ProfileContext] Failed to fetch user profile:', error);
        }
        return null;
    };

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
