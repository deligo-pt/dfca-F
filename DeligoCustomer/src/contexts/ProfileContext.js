import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendOTP, verifyOTP as authVerifyOTP, getUserData, logoutUser as authLogoutUser, saveUserData } from '../utils/auth';
import { customerApi } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';

const ProfileContext = createContext({});

export const ProfileProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getUserData();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } catch (e) {
        // ignore
        console.warn('[ProfileContext] load stored user', e);
      }
    })();
  }, []);

  const sendOtp = async (identifier, method = 'mobile') => {
    try {
      setLoading(true);
      const res = await sendOTP(identifier, method);
      setLoading(false);
      return res;
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  const verifyOtp = async (identifier, otp, method = 'mobile') => {
    try {
      setLoading(true);
      const resp = await authVerifyOTP(identifier, otp, method);
      // authVerifyOTP will save tokens + user via AuthService.login. But ensure we also update context state.
      const returnedUser = resp?.user || (await getUserData());
      if (returnedUser) {
        setUser(returnedUser);
        setIsAuthenticated(true);
      }
      setLoading(false);
      return resp;
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  const resendOtp = async (identifier, method = 'mobile') => {
    return await sendOtp(identifier, method);
  };

  const logout = async () => {
    try {
      setLoading(true);
      const resp = await authLogoutUser();
      // authLogoutUser clears storage; mirror that locally
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return resp;
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const resp = await customerApi.get(API_ENDPOINTS.PROFILE.GET);
      // customerApi returns response.data per api interceptor; resp should be the body
      if (resp) {
        setUser(resp.data || resp);
        // also save into storage so other parts of app can read
        try {
          await saveUserData(resp.data || resp);
        } catch (e) {
          // non-fatal
        }
        setIsAuthenticated(true);
      }
      setLoading(false);
      return resp;
    } catch (err) {
      setLoading(false);
      // If unauthorized, clear local session and return a normalized 401 result so UI can handle redirect
      const status = err?.status || err?.statusCode || (err?.response && err.response.status) || 0;
      console.warn('[ProfileContext] fetchProfile error', status, err);
      if (status === 401) {
        try {
          // clear remote/local session
          await authLogoutUser();
        } catch (e) {
          console.warn('[ProfileContext] error clearing session on 401', e);
        }
        // mirror local state
        setUser(null);
        setIsAuthenticated(false);
        setError({ message: 'Unauthorized', status: 401 });
        return { success: false, status: 401, message: 'Session expired' };
      }

      setError(err);
      // Return normalized error response (don't throw) so callers can decide how to handle UI
      return { success: false, status: status || 0, message: err?.message || 'Failed to fetch profile', raw: err };
    }
  };

  const updateProfile = async (payload) => {
    try {
      setLoading(true);
      const resp = await customerApi.post(API_ENDPOINTS.PROFILE.UPDATE, payload);
      // update local user state if server returns updated user
      const updated = resp?.data || resp;
      if (updated) {
        setUser(updated);
        try {
          await saveUserData(updated);
        } catch (e) {}
      }
      setLoading(false);
      return resp;
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        loading,
        error,
        sendOtp,
        verifyOtp,
        resendOtp,
        logout,
        fetchProfile,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);

export default ProfileContext;
