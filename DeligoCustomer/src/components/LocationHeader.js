import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Selection of premium inspirational shop & food images
const SHOP_IMAGES = [
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=800&auto=format&fit=crop', // Grocery / Supermarket
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop', // Cafe / Restaurant
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop', // Bakery
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=800&auto=format&fit=crop', // Storefront
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=800&auto=format&fit=crop', // Shopping Aisles
];

/**
 * LocationHeader Component
 * 
 * Premium redesigned header based on the "inspirational" UI vibe, 
 * now featuring dynamic shop backgrounds and glassmorphism.
 */
const LocationHeader = ({
  location,
  area,
  loading,
  onLocationPress,
  onSearchPress,
  categories = [],
  onCategoryPress,
  userName = null,
  onProfilePress,
  onNotificationPress,
  paddingTop = 0,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user } = useProfile();
  const insets = useSafeAreaInsets();

  // State for dynamic background
  const [bgImage, setBgImage] = useState(SHOP_IMAGES[0]);

  useEffect(() => {
    // Select a random image every time the component mounts
    const randomImg = SHOP_IMAGES[Math.floor(Math.random() * SHOP_IMAGES.length)];
    setBgImage(randomImg);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  // Profile image handling
  const getProfileImage = () => {
    if (user && user.profilePhoto) return { uri: user.profilePhoto };
    if (user && user.avatar) return { uri: user.avatar };
    // Elegant fallback
    return { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' };
  };

  return (
    <View style={styles(colors, isDarkMode).wrapper}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Main Gradient-like Premium Background */}
      <View style={[styles(colors, isDarkMode).premiumBackground, { paddingTop: insets.top + spacing.sm }]}>

        {/* Dynamic Shop Background Image blending with primary color */}
        <Image
          source={{ uri: bgImage }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          opacity={isDarkMode ? 0.2 : 0.35}
        />

        {/* Robust Dark Status Bar Gradient for Premium Visibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.2)', 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 50,
            zIndex: 1,
          }}
          pointerEvents="none"
        />

        {/* Top Header Row with Profile, Greeting and Icons */}
        <View style={styles(colors, isDarkMode).headerTopRow}>

          <View style={styles(colors, isDarkMode).profileAndGreeting}>
            {/* Profile Avatar with subtle glass wrapper */}
            <TouchableOpacity style={styles(colors, isDarkMode).avatarContainer} onPress={onProfilePress} activeOpacity={0.8}>
              <Image source={getProfileImage()} style={styles(colors, isDarkMode).avatarImage} />
            </TouchableOpacity>

            {/* User Details */}
            <View style={styles(colors, isDarkMode).userDetailsContainer}>
              <Text style={styles(colors, isDarkMode).userNameText} numberOfLines={1}>
                {userName || user?.firstName || t('guest')}
              </Text>
              <Text style={styles(colors, isDarkMode).welcomeText}>
                {t('welcomeBack') || 'Welcome back'} 👋
              </Text>
            </View>
          </View>

          {/* Right Action Icons with Glassmorphism */}
          <View style={styles(colors, isDarkMode).actionIconsContainer}>
            <TouchableOpacity activeOpacity={0.8} onPress={onSearchPress}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.05)']}
                style={styles(colors, isDarkMode).circleIconButton}
              >
                <Ionicons name="search-outline" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={onNotificationPress}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.05)']}
                style={styles(colors, isDarkMode).circleIconButton}
              >
                <Ionicons name="notifications-outline" size={20} color="#ffffff" />
                <View style={styles(colors, isDarkMode).notificationDot} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Premium Card (matching Vendor 'Earning' card style) */}
        <TouchableOpacity
          onPress={onLocationPress}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles(colors, isDarkMode).premiumLocationCard}
          >
            <View style={styles(colors, isDarkMode).walletIconContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors, isDarkMode).pillTextWrapper}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Text style={styles(colors, isDarkMode).pillValueText} numberOfLines={1}>
                  {area || t('setYourLocation')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Upward Overlapping Curve (Vendor App Style) */}
      <View style={styles(colors, isDarkMode).bottomCurve} />

    </View>
  );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
  wrapper: {
    position: 'relative',
    backgroundColor: isDarkMode ? colors.background : colors.background,
  },
  premiumBackground: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 20, // Extra padding for the curve overlap
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    zIndex: 2, // Place above background pattern
  },
  profileAndGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 3,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#ddd',
  },
  userDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    lineHeight: 28,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.95)',
    marginTop: -2,
  },
  actionIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  premiumLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16, // vendor app uses softer rounded rects
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 2,
    elevation: 3,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  walletIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pillTextWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  pillValueText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'left',
    letterSpacing: 0.2,
    paddingRight: 6,
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -1,
    left: -10, // Prevent minor edge bleeding
    right: -10,
    height: 32,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});

export default LocationHeader;
