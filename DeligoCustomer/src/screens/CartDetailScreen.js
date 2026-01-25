import React from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import CartDetail from '../components/CartDetail';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';

/**
 * CartDetailScreen
 * 
 * Displays the full details of a specific vendor cart.
 * Acts as a wrapper around the `CartDetail` component, handling route parameters
 * and providing a dedicated navigation context for the shopping cart view.
 * 
 * @param {Object} props
 * @param {Object} props.route - Route parameters containing `vendorId`.
 * @param {Object} props.navigation - Navigation prop.
 */
export default function CartDetailScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { vendorId } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const { getVendorCart } = useCart();
  const vendor = getVendorCart(vendorId) || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>{vendor.vendorName || t('yourCart')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <CartDetail vendorId={vendorId} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
  },
});
