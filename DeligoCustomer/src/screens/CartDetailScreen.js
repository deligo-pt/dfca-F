import React from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CartDetail from '../components/CartDetail';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';

export default function CartDetailScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { vendorId } = route.params || {};
  const { colors } = useTheme();
  const { getVendorCart } = useCart();
  const vendor = getVendorCart(vendorId) || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
