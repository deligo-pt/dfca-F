import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './src/utils/LanguageContext';
import { ThemeProvider } from './src/utils/ThemeContext';
import { ProductsProvider } from './src/contexts/ProductsContext';
import { CartProvider } from './src/contexts/CartContext';
import { OrdersProvider } from './src/contexts/OrdersContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import * as SystemUI from 'expo-system-ui';
import { StripeProvider } from '@stripe/stripe-react-native';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationPopup from './src/components/NotificationPopup';
import { useNotifications } from './src/contexts/NotificationContext';
import { useTheme } from './src/utils/ThemeContext';

const AppContent = () => {
  const { latestNotification, showPopup, dismissPopup } = useNotifications();
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <RootNavigator />
      <NotificationPopup
        visible={showPopup}
        notification={latestNotification}
        onDismiss={dismissPopup}
        colors={colors}
      />
      <StatusBar style="light" backgroundColor={colors.primary} />
    </NavigationContainer>
  );
};

// Minimal publishable key fallback (use env in production)
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51PT3CjP0xY0uRyP02HGOUxxzweu1yv7l8GMyECLggN1LJrLsbLfGb1lgMuqQHoADgb1LFYC9tDgRcmkaCLGvNFJR00CgHAWWNK';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set default font for all Text and TextInput components
RNText.defaultProps = RNText.defaultProps || {};
RNText.defaultProps.style = [{ fontFamily: 'Poppins-Regular' }];
RNTextInput.defaultProps = RNTextInput.defaultProps || {};
RNTextInput.defaultProps.style = [{ fontFamily: 'Poppins-Regular' }];

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

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
        // initializeApp is no longer needed here as ProfileContext handles it via Provider

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

  // Don't render anything while loading fonts (splash screen is visible)
  if (isLoading) {
    return null;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.deligo.customer"
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ProfileProvider>
              <NotificationProvider>
                <LocationProvider>
                  <ProductsProvider>
                    <CartProvider>
                      <OrdersProvider>
                        <AppContent />
                      </OrdersProvider>
                    </CartProvider>
                  </ProductsProvider>
                </LocationProvider>
              </NotificationProvider>
            </ProfileProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
