/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * A generic storage utility for AsyncStorage.
 */
const StorageService = {
  /**
   * Get an item from storage.
   * @param {string} key The key of the item to get.
   * @returns {Promise<any | null>} The stored item, or null if not found.
   */
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting item with key "${key}" from storage:`, error);
      return null;
    }
  },

  /**
   * Set an item in storage.
   * @param {string} key The key of the item to set.
   * @param {any} value The value to set.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting item with key "${key}" in storage:`, error);
      return false;
    }
  },

  /**
   * Remove an item from storage.
   * @param {string} key The key of the item to remove.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item with key "${key}" from storage:`, error);
      return false;
    }
  },

  /**
   * Clear all items from storage.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async clearAll() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Convenience helpers used by the app
  async getAccessToken() {
    return await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token) {
    return await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async removeAccessToken() {
    return await this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getUser() {
    return await this.getItem(STORAGE_KEYS.USER);
  },

  async setUser(user) {
    return await this.setItem(STORAGE_KEYS.USER, user);
  },

  async removeUser() {
    return await this.removeItem(STORAGE_KEYS.USER);
  },

  // Onboarding helpers expected by screens
  async setOnboardingCompleted() {
    return await this.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
  },

  async checkOnboardingStatus() {
    const val = await this.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return !!val;
  },
};

export const setOnboardingCompleted = async () => {
  return await StorageService.setOnboardingCompleted();
};

export const checkOnboardingStatus = async () => {
  return await StorageService.checkOnboardingStatus();
};

export const getAccessToken = async () => {
  return await StorageService.getAccessToken();
};

export const setAccessToken = async token => {
  return await StorageService.setAccessToken(token);
};

export const removeAccessToken = async () => {
  return await StorageService.removeAccessToken();
};

export const getUser = async () => {
  return await StorageService.getUser();
};

export const setUser = async user => {
  return await StorageService.setUser(user);
};

export const removeUser = async () => {
  return await StorageService.removeUser();
};

export default StorageService;
