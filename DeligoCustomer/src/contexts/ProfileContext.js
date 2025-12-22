import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService, { logoutUser as apiLogout } from '../utils/auth';

export const ProfileContext = createContext(null);

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

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
            console.error('ProfileContext: Error checking auth status', error);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const login = async (userData, token) => {
        try {
            // AuthService.login saves to storage
            await AuthService.login(userData, token);
            setUser(userData);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error('ProfileContext: Login failed', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await apiLogout(); // Calls backend and clears storage
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('ProfileContext: Logout failed', error);
            // Force local cleanup even if API fails
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const updateProfile = async (updatedData, imageFile = null) => {
        try {
            const { customerApi } = await import('../utils/api');
            const { API_ENDPOINTS } = await import('../constants/config').then(m => m.default || m);

            // Clone data to avoid mutating original object
            const dataToUpdate = { ...updatedData };
            
            // Backend forbids customers from updating their contact number.
            // Removing it here as a safety measure for all profile updates.
            delete dataToUpdate.contactNumber;

            // Profile photo must be uploaded as a file, not as a string in the JSON data.
            // If we have an image file that is a local URI (not a remote URL), we upload it.
            // We remove it from the JSON data in all cases to avoid the "text" error from backend.
            delete dataToUpdate.profilePhoto;

            // Prepare form data - Backend expects a 'data' field with JSON string for profile updates
            const formData = new FormData();
            formData.append('data', JSON.stringify(dataToUpdate));

            // Add image file if present and it's a local file
            if (imageFile && imageFile.uri && !imageFile.uri.startsWith('http')) {
                formData.append('file', {
                    uri: imageFile.uri,
                    type: imageFile.type || 'image/jpeg',
                    name: imageFile.name || `profile-${Date.now()}.jpg`
                });
            }

            // Call API to update profile on server
            // Prefer userId (e.g., C-xxxx) for the /customers/:id endpoint as requested by backend
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
                // Save to local storage
                await import('../utils/auth').then(mod => mod.saveUserData(updatedUser));
                return true;
            } else {
                console.error('ProfileContext: No data returned from update API');
                return false;
            }
        } catch (error) {
            console.error('ProfileContext: Update profile failed', error);
            
            // Re-throw with meaningful message if possible for the UI to catch
            if (error.response) {
                const data = error.response.data;
                
                // Handle MongoDB Duplicate Key Error
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

    const completeOnboarding = async () => {
        try {
            await AuthService.setOnboardingStatus('true');
            setIsOnboardingCompleted(true);
        } catch (error) {
            console.error('ProfileContext: completeOnboarding failed', error);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const { customerApi } = await import('../utils/api');
            const { API_ENDPOINTS } = await import('../constants/config').then(m => m.default || m);

            // Call API
            const response = await customerApi.get(API_ENDPOINTS.PROFILE.GET);
            const userData = response?.data || response;

            if (userData) {
                console.log('[ProfileContext] Fetched fresh user profile:', userData?.name || userData?.firstName);
                setUser(userData);
                // Update local storage
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
            fetchUserProfile
        }}>
            {children}
        </ProfileContext.Provider>
    );
};
