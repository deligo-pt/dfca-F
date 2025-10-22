import React from 'react';
import { View, StyleSheet } from 'react-native';

// Categories Icon
export const CategoriesIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={styles.gridContainer}>
      <View style={[styles.gridItem, { backgroundColor: color, top: 0, left: 0 }]} />
      <View style={[styles.gridItem, { backgroundColor: color, top: 0, right: 0 }]} />
      <View style={[styles.gridItem, { backgroundColor: color, bottom: 0, left: 0 }]} />
      <View style={[styles.gridItem, { backgroundColor: color, bottom: 0, right: 0 }]} />
    </View>
  </View>
);

// Orders Icon
export const OrdersIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.orderBox, { borderColor: color }]}>
      <View style={[styles.orderLine, { backgroundColor: color }]} />
      <View style={[styles.orderLine, { backgroundColor: color, width: 12 }]} />
      <View style={[styles.orderLine, { backgroundColor: color, width: 14 }]} />
    </View>
  </View>
);

// Cart Icon
export const CartIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.cartBody, { borderColor: color }]} />
    <View style={[styles.cartWheel, { backgroundColor: color }]} />
    <View style={[styles.cartWheel, { backgroundColor: color, right: 4 }]} />
  </View>
);

// Profile Icon
export const ProfileIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.profileHead, { backgroundColor: color }]} />
    <View style={[styles.profileBody, { borderColor: color }]} />
  </View>
);

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Categories Icon
  gridContainer: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  gridItem: {
    width: 9,
    height: 9,
    borderRadius: 2,
    position: 'absolute',
  },
  // Orders Icon
  orderBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  orderLine: {
    height: 2,
    width: 10,
    borderRadius: 1,
    marginVertical: 1,
  },
  // Cart Icon
  cartBody: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginBottom: 4,
  },
  cartWheel: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: 2,
  },
  // Profile Icon
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 2,
  },
  profileBody: {
    width: 16,
    height: 12,
    borderWidth: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'absolute',
    bottom: 0,
  },
});

