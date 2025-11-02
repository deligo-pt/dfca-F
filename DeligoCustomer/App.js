import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingScreen, LoginScreen, TermsOfServiceScreen, PrivacyPolicyScreen, LocationAddressScreen, RestaurantDetailsScreen, TrackOrderScreen, CheckoutScreen, EditProfileScreen, VouchersScreen, SavedAddressesScreen, PaymentMethodsScreen, ReferralsScreen, NotificationsScreen, SettingsScreen, HelpCenterScreen } from './src/screens';
import { BottomTabNavigator } from './src/navigation';
import { checkOnboardingStatus } from './src/utils/storage';
import { isUserAuthenticated, getUserData } from './src/utils/auth';
import { colors } from './src/theme';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { createStackNavigator } from '@react-navigation/stack';
import { LanguageProvider } from './src/utils/LanguageContext';
import { ThemeProvider } from './src/utils/ThemeContext';
import * as SystemUI from 'expo-system-ui';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
      try {
        // Start timing
        // Set system UI colors for notch areas (top and bottom)
        await SystemUI.setBackgroundColorAsync(colors.primary);

        const startTime = Date.now();

        await loadFonts();
        await initializeApp();

        // Ensure splash screen shows for at least 2 seconds
        const elapsedTime = Date.now() - startTime;
        const minimumTime = 2000; // 2 seconds
        if (elapsedTime < minimumTime) {
          await new Promise(resolve => setTimeout(resolve, minimumTime - elapsedTime));
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setIsLoading(false);
        // Hide the splash screen
        await SplashScreen.hideAsync();
      }
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

  // Don't render anything while loading - the native splash screen will show
  // It has the pink background configured in app.json
  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
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
              <Stack.Screen name="LocationAddress" component={LocationAddressScreen} />
              <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
              <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />

              {/* Account Related Screens */}
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Vouchers" component={VouchersScreen} />
              <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
              <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
              <Stack.Screen name="Referrals" component={ReferralsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            </Stack.Navigator>
            <StatusBar style="light" backgroundColor={colors.primary} />
          </NavigationContainer>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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
