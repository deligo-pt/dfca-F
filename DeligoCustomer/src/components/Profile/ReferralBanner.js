import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../utils/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';

/**
 * ReferralBanner Component
 * 
 * High-visibility promotional banner for the referral program.
 * Triggers navigation to the Referrals screen.
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop.
 */
const ReferralBanner = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={[
        styles.referralBanner,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          shadowColor: colors.primary
        }
      ]}
      onPress={() => navigation.navigate('Referrals')}
      activeOpacity={0.85}
    >
      <View style={styles.referralContent}>
        <View style={styles.referralLeft}>
          <Text style={styles.referralEmoji}>🎉</Text>
        </View>
        <View style={styles.referralMiddle}>
          <Text style={[styles.referralTitle, { color: colors.text.primary }]}>
            {t('referralBannerTitle')}
          </Text>
          <Text style={[styles.referralSubtitle, { color: colors.primary }]}>
            {t('referralBannerSubtitle')}
          </Text>
        </View>
        <View style={styles.referralRight}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  referralBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  referralLeft: {
    marginRight: 12,
  },
  referralEmoji: {
    fontSize: 42,
  },
  referralMiddle: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  referralRight: {
    marginLeft: 8,
  },
});

export default ReferralBanner;
