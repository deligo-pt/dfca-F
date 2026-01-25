import React from 'react';
import { View, Image, StyleSheet, Dimensions, StatusBar, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * CustomSplashScreen Component
 * 
 * Branded launch screen shown during app initialization.
 * Consistent with native splash screen theme.
 */
export const CustomSplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#DC3173" barStyle="light-content" />
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#DC3173', // Brand Primary Color
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it sits on top of any absolute positioned elements
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    maxWidth: 240,
    maxHeight: 240,
  },
});

