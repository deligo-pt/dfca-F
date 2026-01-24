import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [translations, setTranslations] = useState(getLanguageTranslations('en'));

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage) {
        changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      setLanguage(newLanguage);
      setTranslations(getLanguageTranslations(newLanguage));
      await AsyncStorage.setItem('app_language', newLanguage);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const t = (key) => {
    if (!key) return '';

    // Direct lookup (fast path)
    if (translations[key]) return translations[key];

    // Nested lookup for keys with dots (e.g., 'permissions.introTitle')
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = translations;
      for (let k of keys) {
        value = value?.[k];
        if (!value) break;
      }
      if (value && typeof value === 'string') return value;
    }

    // Debug missing keys
    if (!translations[key] && !key.includes('.')) {
      console.warn(`[LanguageContext] Missing key: ${key}`);
    }

    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

