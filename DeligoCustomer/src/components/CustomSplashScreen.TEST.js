import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

/**
 * CustomSplashScreen (Test Utility)
 * 
 * A lightweight, dependency-free splash screen implementation for testing purposes.
 * Renders the primary brand color and typography to validate correct splash behavior
 * in isolation from the main application initialization logic.
 */
export const CustomSplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#DC3173" barStyle="light-content" />
      <Text style={styles.text}>Deligo</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC3173', // Brand Primary Color
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
});

