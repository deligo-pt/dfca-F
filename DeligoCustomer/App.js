import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingScreen, LoginScreen, TermsOfServiceScreen, PrivacyPolicyScreen } from './src/screens';
import { BottomTabNavigator } from './src/navigation';
import { checkOnboardingStatus } from './src/utils/storage';
import { isUserAuthenticated, getUserData } from './src/utils/auth';
import { colors } from './src/theme';
import * as Font from 'expo-font';
import { createStackNavigator } from '@react-navigation/stack';

// Set default font for all Text and TextInput components
RNText.defaultProps = RNText.defaultProps || {};
RNText.defaultProps.style = [{ fontFamily: 'Poppins-Regular' }];
RNTextInput.defaultProps = RNTextInput.defaultProps || {};
RNTextInput.defaultProps.style = [{ fontFamily: 'Poppins-Regular' }];

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Load Poppins fonts
  const loadFonts = async () => {
    await Font.loadAsync({
      'Poppins-Black': require('./src/assets/fonts/Poppins/Poppins-Black.ttf'),
      'Poppins-BlackItalic': require('./src/assets/fonts/Poppins/Poppins-BlackItalic.ttf'),
      'Poppins-Bold': require('./src/assets/fonts/Poppins/Poppins-Bold.ttf'),
      'Poppins-BoldItalic': require('./src/assets/fonts/Poppins/Poppins-BoldItalic.ttf'),
      'Poppins-ExtraBold': require('./src/assets/fonts/Poppins/Poppins-ExtraBold.ttf'),
      'Poppins-ExtraBoldItalic': require('./src/assets/fonts/Poppins/Poppins-ExtraBoldItalic.ttf'),
      'Poppins-ExtraLight': require('./src/assets/fonts/Poppins/Poppins-ExtraLight.ttf'),
      'Poppins-ExtraLightItalic': require('./src/assets/fonts/Poppins/Poppins-ExtraLightItalic.ttf'),
      'Poppins-Italic': require('./src/assets/fonts/Poppins/Poppins-Italic.ttf'),
      'Poppins-Light': require('./src/assets/fonts/Poppins/Poppins-Light.ttf'),
      'Poppins-LightItalic': require('./src/assets/fonts/Poppins/Poppins-LightItalic.ttf'),
      'Poppins-Medium': require('./src/assets/fonts/Poppins/Poppins-Medium.ttf'),
      'Poppins-MediumItalic': require('./src/assets/fonts/Poppins/Poppins-MediumItalic.ttf'),
      'Poppins-Regular': require('./src/assets/fonts/Poppins/Poppins-Regular.ttf'),
      'Poppins-SemiBold': require('./src/assets/fonts/Poppins/Poppins-SemiBold.ttf'),
      'Poppins-SemiBoldItalic': require('./src/assets/fonts/Poppins/Poppins-SemiBoldItalic.ttf'),
      'Poppins-Thin': require('./src/assets/fonts/Poppins/Poppins-Thin.ttf'),
      'Poppins-ThinItalic': require('./src/assets/fonts/Poppins/Poppins-ThinItalic.ttf'),
    });
  };

  useEffect(() => {
    const prepare = async () => {
      await loadFonts();
      await initializeApp();
      setIsLoading(false);
    };
    prepare();
  }, []);

  const initializeApp = async () => {
    try {
      const onboardingCompleted = await checkOnboardingStatus();
      setShowOnboarding(!onboardingCompleted);

      // Check if user is already logged in
      const authenticated = await isUserAuthenticated();
      if (authenticated) {
        const userData = await getUserData();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingDone = () => {
    setShowOnboarding(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary || '#000'} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showOnboarding ? (
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen {...props} onDone={handleOnboardingDone} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main">
            {(props) => <BottomTabNavigator {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        )}
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
