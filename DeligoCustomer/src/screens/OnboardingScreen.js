import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DealsIllustration, DeliveryIllustration, DiscoverIllustration } from '../components/OnboardingIllustrations';
import { colors } from '../theme';
import { useProfile } from '../contexts/ProfileContext';

/**
 * OnboardingScreen
 * 
 * Introduction flow for new users displaying core value propositions.
 * Slides:
 * 1. Exclusive Deals
 * 2. Fast Delivery
 * 3. Discover Restaurants
 * 
 * Manages first-time user navigation and persistence via ProfileContext.
 */
const slides = [
  {
    key: 'deals',
    title: 'Exclusive Deals',
    text: 'Get amazing deals and discounts on your favorite meals. Save more on every order!',
    illustration: DealsIllustration,
    backgroundColor: colors.primary,
  },
  {
    key: 'deliver',
    title: 'Fast Delivery',
    text: 'Your food delivered hot and fresh to your doorstep in no time. Track your order in real-time!',
    illustration: DeliveryIllustration,
    backgroundColor: colors.primary,
  },
  {
    key: 'discover',
    title: 'Discover Restaurants',
    text: 'Explore hundreds of restaurants and cuisines around you. Find your next favorite meal!',
    illustration: DiscoverIllustration,
    backgroundColor: colors.primary,
  },
];

const OnboardingScreen = () => {
  const { completeOnboarding } = useProfile();

  const renderItem = ({ item }) => {
    const IllustrationComponent = item.illustration;
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.content}>
          <View style={styles.illustrationWrapper}>
            <IllustrationComponent />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const onDonePress = async () => {
    await completeOnboarding();
  };

  const onSkipPress = async () => {
    await completeOnboarding();
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Text style={styles.buttonText}>→</Text>
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Text style={styles.buttonText}>✓</Text>
      </View>
    );
  };

  const renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <AppIntroSlider
        data={slides}
        renderItem={renderItem}
        onDone={onDonePress}
        onSkip={onSkipPress}
        renderNextButton={renderNextButton}
        renderDoneButton={renderDoneButton}
        renderSkipButton={renderSkipButton}
        showSkipButton
        dotStyle={styles.dotStyle}
        activeDotStyle={styles.activeDotStyle}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  buttonCircle: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  dotStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDotStyle: {
    backgroundColor: colors.text.white,
    width: 24,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default OnboardingScreen;
