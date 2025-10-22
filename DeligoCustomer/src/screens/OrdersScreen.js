import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

const OrdersScreen = () => {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.container}>
        <Text style={styles.headerText}>Orders</Text>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subText}>Your order history</Text>
          {/* Add your orders content here */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    padding: 20,
    paddingTop: 60,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 20,
  },
  subText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
});

export default OrdersScreen;
