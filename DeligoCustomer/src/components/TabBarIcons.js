import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * CategoriesIcon
 * Renders a grid icon representing product categories.
 */
export const CategoriesIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={styles.gridContainer}>
      <View style={[styles.gridItem, { backgroundColor: focused ? color : color, opacity: focused ? 1 : 0.6 }]} />
      <View style={[styles.gridItem, { backgroundColor: focused ? color : color, opacity: focused ? 1 : 0.6 }]} />
      <View style={[styles.gridItem, { backgroundColor: focused ? color : color, opacity: focused ? 1 : 0.6 }]} />
      <View style={[styles.gridItem, { backgroundColor: focused ? color : color, opacity: focused ? 1 : 0.6 }]} />
    </View>
  </View>
);

/**
 * OrdersIcon
 * Renders a document icon representing user orders.
 * Shows detailed lines when active.
 */
export const OrdersIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.orderDocument, { backgroundColor: focused ? color : 'transparent', borderColor: color, opacity: focused ? 1 : 0.6 }]}>
      {!focused && (
        <>
          <View style={[styles.orderLine, { backgroundColor: color }]} />
          <View style={[styles.orderLine, { backgroundColor: color }]} />
          <View style={[styles.orderLine, { backgroundColor: color, width: 10 }]} />
        </>
      )}
      {focused && (
        <>
          <View style={[styles.orderLine, { backgroundColor: '#FFFFFF' }]} />
          <View style={[styles.orderLine, { backgroundColor: '#FFFFFF' }]} />
          <View style={[styles.orderLine, { backgroundColor: '#FFFFFF', width: 10 }]} />
        </>
      )}
    </View>
  </View>
);

/**
 * CartIcon
 * Renders a detailed shopping cart icon with wheels and handle.
 */
export const CartIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={styles.cartWrapper}>
      <View style={[styles.cartBasket, {
        backgroundColor: focused ? color : 'transparent',
        borderColor: color,
      }]}>
        <View style={[styles.cartHandle, {
          backgroundColor: focused ? '#FFFFFF' : color,
        }]} />
      </View>
      <View style={styles.cartWheels}>
        <View style={[styles.cartWheel, {
          backgroundColor: focused ? color : color,
          opacity: focused ? 1 : 0.6,
        }]} />
        <View style={[styles.cartWheel, {
          backgroundColor: focused ? color : color,
          opacity: focused ? 1 : 0.6,
        }]} />
      </View>
    </View>
  </View>
);

/**
 * ProfileIcon
 * Renders a user avatar icon.
 */
export const ProfileIcon = ({ focused, color }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.profileCircle, { backgroundColor: focused ? color : 'transparent', borderColor: color, opacity: focused ? 1 : 0.6 }]}>
      <View style={[styles.profileHead, { backgroundColor: focused ? '#FFFFFF' : color }]} />
      <View style={[styles.profileShoulders, { borderColor: focused ? '#FFFFFF' : color }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Categories Icon Styles
  gridContainer: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridItem: {
    width: 8.5,
    height: 8.5,
    borderRadius: 2.5,
    margin: 0.5,
  },
  // Orders Icon Styles
  orderDocument: {
    width: 20,
    height: 24,
    borderWidth: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  orderLine: {
    height: 2,
    width: 12,
    borderRadius: 1,
    marginVertical: 1.5,
  },
  // Cart Icon Styles
  cartWrapper: {
    width: 22,
    height: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cartBasket: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderTopRightRadius: 3,
    borderTopLeftRadius: 1,
    position: 'relative',
    marginBottom: 2,
  },
  cartHandle: {
    position: 'absolute',
    top: -4,
    left: -2,
    width: 2,
    height: 10,
    borderRadius: 1,
    transform: [{ rotate: '-15deg' }],
  },
  cartWheels: {
    width: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  cartWheel: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Profile Icon Styles
  profileCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 3,
  },
  profileShoulders: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomWidth: 0,
    marginTop: 2,
  },
});


