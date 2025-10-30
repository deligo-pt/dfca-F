import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

// ULTRA SIMPLE TEST VERSION - JUST PINK BACKGROUND
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
    backgroundColor: '#DC3173', // PINK - THIS SHOULD BE VISIBLE!
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

