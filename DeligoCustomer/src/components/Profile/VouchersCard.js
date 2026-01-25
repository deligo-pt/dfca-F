import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

/**
 * VouchersCard Component
 * 
 * Navigation entry point for the user's vouchers section.
 * Displays a badge for active/available vouchers.
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop.
 */
const VouchersCard = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.voucherItem}
        onPress={() => navigation.navigate('Vouchers')}
      >
        <View style={[styles.voucherIconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="ticket" size={24} color={colors.primary} />
        </View>

        <Text style={[styles.voucherText, { color: colors.text.primary }]}>{t('vouchers')}</Text>

        {/* Badge indicating the number of available vouchers (Currently static '0', connect to state) */}
        <View style={[styles.voucherBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.voucherBadgeText}>0</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  voucherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  voucherIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  voucherText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  voucherBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
    minWidth: 28,
    alignItems: 'center',
  },
  voucherBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default VouchersCard;
