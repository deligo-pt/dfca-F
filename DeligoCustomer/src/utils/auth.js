import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Mock users database
export const mockUsers = {
  mobile: {
    '1234567890': {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      mobile: '1234567890',
      otp: '1234'
    },
    '9876543210': {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      mobile: '9876543210',
      otp: '1234'
    },
  },
  email: {
    'test@example.com': {
      id: '3',
      name: 'Test User',
      email: 'test@example.com',
      mobile: '1111111111',
      otp: '1234'
    },
    'demo@deligo.com': {
      id: '4',
      name: 'Demo User',
      email: 'demo@deligo.com',
      mobile: '2222222222',
      otp: '1234'
    },
  },
};

// Save user data after successful login
export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'mock-token-' + userData.id);
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

// Get stored user data
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Check if user is authenticated
export const isUserAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

// Mock OTP sending
export const sendOTP = async (identifier, method) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[method][identifier];
      if (user) {
        resolve({
          success: true,
          message: 'OTP sent successfully',
          otp: user.otp, // In real app, don't return OTP
        });
      } else {
        reject({
          success: false,
          message: 'User not found',
        });
      }
    }, 1500);
  });
};

// Mock OTP verification
export const verifyOTP = async (identifier, otp, method) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[method][identifier];
      if (user && otp === user.otp) {
        resolve({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
          },
        });
      } else {
        reject({
          success: false,
          message: 'Invalid OTP',
        });
      }
    }, 1000);
  });
};

