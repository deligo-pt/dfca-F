/**
 * Language Context
 * 
 * Manages application localization state, providing translation strings and
 * language switching capabilities using persistent storage.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguageTranslations } from './i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  // Use useMemo to stay synced with i18n file changes during dev
  const translations = useMemo(() => getLanguageTranslations(language), [language]);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      setLanguage(newLanguage);
      await AsyncStorage.setItem('app_language', newLanguage);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  /**
   * Translation function with nested key support
   * @param {string} key - e.g. 'home.title'
   * @param {string} [defaultValue] - Optional fallback
   */
  const t = (key, defaultValue) => {
    if (!key) return defaultValue || '';

    // Direct lookup for performance
    if (translations[key]) return translations[key];

    // Handle nested keys (e.g. 'auth.login.title')
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = translations;
      for (let k of keys) {
        value = value?.[k];
        if (!value) break;
      }
      if (typeof value === 'string') return value;
    }

    // If key has no translation, return defaultValue if provided, else return the key itself
    if (defaultValue !== undefined) return defaultValue;

    // Log missing keys only in development
    if (__DEV__) {
      // Avoid excessive logging
      // console.warn(`[LanguageContext] Missing translation for: "${key}" in language: "${language}"`);
    }

    return key;
  };

  const contextValue = useMemo(() => ({
    language,
    changeLanguage,
    t,
    translations
  }), [language, translations]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

