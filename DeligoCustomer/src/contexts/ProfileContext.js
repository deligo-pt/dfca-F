
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService, { logoutUser as apiLogout } from '../utils/auth';
import StorageService from '../utils/storage';

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

    const updateProfile = async (updatedData) => {
        try {
            const newUser = { ...user, ...updatedData };
            setUser(newUser);

            // Save using auth helper
            await import('../utils/auth').then(mod => mod.saveUserData(newUser));
            return true;
        } catch (error) {
            console.error('ProfileContext: Update profile failed', error);
            return false;
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
            completeOnboarding
        }}>
            {children}
        </ProfileContext.Provider>
    );
};
