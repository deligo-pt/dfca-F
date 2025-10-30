import React from 'react';
import { View, Image, StyleSheet, Dimensions, StatusBar, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

export const CustomSplashScreen = () => {
  console.log('🎨 CustomSplashScreen is rendering with PINK background!');

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#DC3173" barStyle="light-content" />
      <Text style={styles.testText}>PINK TEST</Text>
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
    backgroundColor: '#DC3173', // PINK BACKGROUND - SHOULD ALWAYS BE VISIBLE
    justifyContent: 'center',
    alignItems: 'center',
  },
  testText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 300,
    maxHeight: 300,
  },
});

