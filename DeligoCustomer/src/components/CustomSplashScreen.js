import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Easing,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

/**
 * Ultra-Premium Cinematic Splash Screen (Animated Typography Edition)
 */
export const CustomSplashScreen = ({ onFinish }) => {
  // --- Animation Values ---
  const logoScale = useRef(new Animated.Value(1)).current; // Start at full scale to match native splash icon
  const logoOpacity = useRef(new Animated.Value(1)).current; // Start visible to avoid a flash of nothing
  const logoBloom = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Background Depth Elements
  const bgCircle1 = useRef(new Animated.Value(0)).current;

  // Glow Rings
  const ring1Scale = useRef(new Animated.Value(0.7)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.7)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // Typography Animation (D-e-l-i-G-o)
  const brandChars = ['D', 'e', 'l', 'i', 'G', 'o'];
  const charAnims = useRef(brandChars.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Hide native splash on the very first painted frame of the custom splash
    // This ensures seamless handoff: native splash → custom animated splash (no gap, no double)
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });

    // 1. Background Circles Floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgCircle1, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bgCircle1, { toValue: 0, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    // 2. Main Sequence 
    Animated.sequence([
      // Stage A: Logo Arrival
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1, // Already 1, keep it there or slightly shimmer
          useNativeDriver: true,
        }),
        Animated.timing(logoBloom, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),

      // Stage B: Explosion of Rings
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Opacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(ring1Scale, {
          toValue: 4,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(200),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring2Opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.timing(ring2Scale, {
            toValue: 5,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),

        // Staggered Typography Reveal
        Animated.stagger(80, charAnims.map(charAnim => 
          Animated.timing(charAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          })
        )),
      ]),

      // Stage C: Final Hold and Exit
      Animated.delay(1200),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const LOGO_SIZE = width * 0.38;

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />

      {/* Primary Brand Gradient */}
      <LinearGradient
        colors={['#FF4B8B', '#DC3173', '#8A1448']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Circles */}
      <Animated.View style={[styles.bgCircle, { 
        top: '20%', left: '10%', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        transform: [{ scale: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }]
      }]} />

      <View style={styles.centerStack}>
        
        {/* Glow Bloom (Circular White Bloom) */}
        <Animated.View style={[styles.logoBloom, {
          width: LOGO_SIZE * 1.6,
          height: LOGO_SIZE * 1.6,
          borderRadius: LOGO_SIZE * 0.8,
          opacity: logoBloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          transform: [{ scale: logoScale }]
        }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Ring 2 */}
        <Animated.View style={[styles.glowRing, {
          width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE/2,
          opacity: ring2Opacity, transform: [{ scale: ring2Scale }]
        }]} />

        {/* Ring 1 */}
        <Animated.View style={[styles.glowRing, {
          width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE/2,
          opacity: ring1Opacity, transform: [{ scale: ring1Scale }],
          borderColor: 'rgba(255,255,255,0.8)',
        }]} />

        {/* Logo Wrapper (The Circular Mask) */}
        <Animated.View style={[styles.logoWrapper, {
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          borderRadius: LOGO_SIZE / 2, // Circular Masking
          opacity: logoOpacity,
          transform: [{ scale: logoScale }]
        }]}>
          <Image
            source={require('../assets/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="cover" 
          />
          <View style={styles.logoBorder} />
        </Animated.View>
      </View>

      {/* Animated Brand Title (Staggered Characters) */}
      <View style={styles.footer}>
        <View style={styles.charContainer}>
          {brandChars.map((char, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.brandChar,
                {
                  opacity: charAnims[index],
                  transform: [
                    {
                      translateY: charAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                    {
                      scale: charAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>
      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  bgCircle: {
    position: 'absolute',
  },
  centerStack: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBloom: {
    position: 'absolute',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', 
    backgroundColor: '#DC3173', 
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
  },
  charContainer: {
    flexDirection: 'row',
  },
  brandChar: {
    fontSize: 42,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    marginHorizontal: 1,
  },
});
