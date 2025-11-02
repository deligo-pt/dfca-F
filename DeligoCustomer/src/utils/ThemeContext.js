import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Light theme colors
export const lightColors = {
  primary: '#DC3173',
  secondary: '#FF6B9D',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999',
    white: '#FFFFFF',
  },
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  border: '#E0E0E0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
export const darkColors = {
  primary: '#DC3173',
  secondary: '#FF6B9D',
  background: '#121212',
  surface: '#1E1E1E',
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    light: '#808080',
    white: '#FFFFFF',
  },
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  border: '#333333',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const THEME_KEY = '@deligo_theme_mode';

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colors, setColors] = useState(lightColors);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        setColors(isDark ? darkColors : lightColors);
      } else {
        // Use system preference if no saved preference
        const colorScheme = Appearance.getColorScheme();
        const isDark = colorScheme === 'dark';
        setIsDarkMode(isDark);
        setColors(isDark ? darkColors : lightColors);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newIsDarkMode = !isDarkMode;
      setIsDarkMode(newIsDarkMode);
      setColors(newIsDarkMode ? darkColors : lightColors);
      await AsyncStorage.setItem(THEME_KEY, newIsDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setTheme = async (mode) => {
    try {
      const isDark = mode === 'dark';
      setIsDarkMode(isDark);
      setColors(isDark ? darkColors : lightColors);
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

