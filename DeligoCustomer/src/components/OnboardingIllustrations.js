import React from 'react';
import { View, StyleSheet } from 'react-native';

// Deals Illustration
export const DealsIllustration = () => (
  <View style={styles.illustrationContainer}>
    <View style={styles.giftBox}>
      <View style={styles.giftRibbon} />
      <View style={styles.giftBody}>
        <View style={styles.percentageTag}>
          <View style={styles.percentSymbol} />
        </View>
      </View>
      <View style={styles.sparkle1} />
      <View style={styles.sparkle2} />
      <View style={styles.sparkle3} />
    </View>
  </View>
);

// Delivery Illustration
export const DeliveryIllustration = () => (
  <View style={styles.illustrationContainer}>
    <View style={styles.deliveryTruck}>
      <View style={styles.truckCabin} />
      <View style={styles.truckBody} />
      <View style={styles.wheel1} />
      <View style={styles.wheel2} />
      <View style={styles.speedLine1} />
      <View style={styles.speedLine2} />
      <View style={styles.speedLine3} />
    </View>
  </View>
);

// Discover Illustration
export const DiscoverIllustration = () => (
  <View style={styles.illustrationContainer}>
    <View style={styles.plateContainer}>
      <View style={styles.plate} />
      <View style={styles.fork} />
      <View style={styles.knife} />
      <View style={styles.food1} />
      <View style={styles.food2} />
      <View style={styles.food3} />
      <View style={styles.steam1} />
      <View style={styles.steam2} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  illustrationContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Deals Illustration Styles
  giftBox: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftRibbon: {
    width: 20,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    position: 'absolute',
    borderRadius: 10,
  },
  giftBody: {
    width: 120,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  percentageTag: {
    width: 60,
    height: 60,
    backgroundColor: '#FFD700',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentSymbol: {
    width: 30,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  sparkle1: {
    width: 15,
    height: 15,
    backgroundColor: '#FFD700',
    borderRadius: 7.5,
    position: 'absolute',
    top: -10,
    left: 20,
  },
  sparkle2: {
    width: 12,
    height: 12,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    position: 'absolute',
    top: 10,
    right: -15,
  },
  sparkle3: {
    width: 10,
    height: 10,
    backgroundColor: '#FFD700',
    borderRadius: 5,
    position: 'absolute',
    bottom: -5,
    right: 10,
  },

  // Delivery Illustration Styles
  deliveryTruck: {
    width: 180,
    height: 100,
    position: 'relative',
  },
  truckCabin: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 5,
    position: 'absolute',
    left: 0,
    bottom: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  truckBody: {
    width: 100,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    position: 'absolute',
    right: 0,
    bottom: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  wheel1: {
    width: 30,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#fff',
    position: 'absolute',
    left: 30,
    bottom: 0,
  },
  wheel2: {
    width: 30,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#fff',
    position: 'absolute',
    right: 20,
    bottom: 0,
  },
  speedLine1: {
    width: 30,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
    position: 'absolute',
    left: -35,
    top: 20,
  },
  speedLine2: {
    width: 25,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
    position: 'absolute',
    left: -30,
    top: 35,
  },
  speedLine3: {
    width: 20,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    position: 'absolute',
    left: -25,
    top: 50,
  },

  // Discover Illustration Styles
  plateContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plate: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 65,
    borderWidth: 5,
    borderColor: '#fff',
  },
  fork: {
    width: 8,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    position: 'absolute',
    left: -20,
    top: 35,
    transform: [{ rotate: '-25deg' }],
  },
  knife: {
    width: 8,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    position: 'absolute',
    right: -20,
    top: 35,
    transform: [{ rotate: '25deg' }],
  },
  food1: {
    width: 40,
    height: 40,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    position: 'absolute',
    top: 35,
    left: 45,
  },
  food2: {
    width: 35,
    height: 35,
    backgroundColor: '#FF6347',
    borderRadius: 17.5,
    position: 'absolute',
    top: 60,
    right: 40,
  },
  food3: {
    width: 30,
    height: 30,
    backgroundColor: '#32CD32',
    borderRadius: 15,
    position: 'absolute',
    bottom: 45,
    left: 50,
  },
  steam1: {
    width: 15,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    position: 'absolute',
    top: 15,
    left: 60,
  },
  steam2: {
    width: 12,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    position: 'absolute',
    top: 10,
    left: 80,
  },
});

export default {
  DealsIllustration,
  DeliveryIllustration,
  DiscoverIllustration,
};

