import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const ReferralsScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const referralCode = 'DELIGO2025';
  const referralsCount = 5;
  const rewardsEarned = 500;

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('referralMessage', { code: referralCode }),
      });
    } catch (error) {
      console.error('Share error', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
    },
    content: {
      padding: 16,
      paddingBottom: 24,
      backgroundColor: colors.background,
    },
    codeCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    codeIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    codeTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 12,
    },
    codeContainer: {
      backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.1)',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: 20,
    },
    code: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
      fontFamily: 'Poppins-Bold',
      letterSpacing: 2,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.white,
      fontFamily: 'Poppins-SemiBold',
      marginLeft: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
      fontFamily: 'Poppins-Bold',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 16,
    },
    stepCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    stepNumber: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    stepNumberText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.white,
      fontFamily: 'Poppins-Bold',
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: 4,
    },
    stepText: {
      fontSize: 14,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('referrals')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.codeCard}>
          <View style={styles.codeIconContainer}>
            <Ionicons name="gift" size={40} color={colors.primary} />
          </View>
          <Text style={styles.codeTitle}>{t('yourReferralCode')}</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.code}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={colors.text.white} />
            <Text style={styles.shareButtonText}>{t('shareCode')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referralsCount}</Text>
            <Text style={styles.statLabel}>{t('friendsReferred')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>€{rewardsEarned}</Text>
            <Text style={styles.statLabel}>{t('rewardsEarned')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('howItWorks')}</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('shareYourCode')}</Text>
              <Text style={styles.stepText}>{t('sendReferralCode')}</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('theySignUp')}</Text>
              <Text style={styles.stepText}>{t('friendCreatesAccount')}</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('bothGetRewards')}</Text>
              <Text style={styles.stepText}>{t('bothReceiveDiscount')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReferralsScreen;
