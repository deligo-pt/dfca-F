/**
 * PaymentMethodsScreen
 * 
 * Manages the user's saved payment options (Cards, UPI) and provides interfaces
 * for adding new payment methods.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const PaymentMethodsScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      type: 'card',
      name: 'Visa',
      lastFour: '4532',
      expiry: '12/25',
      isDefault: true,
    },
    {
      id: 2,
      type: 'upi',
      name: 'Google Pay',
      upiId: 'user@oksbi',
      isDefault: false,
    },
  ]);

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
      backgroundColor: colors.surface,
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
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      fontFamily: 'Poppins-SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    paymentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    paymentIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? '#2A1A2E' : '#FFF0F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    paymentName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'Poppins-SemiBold',
      marginRight: 8,
    },
    defaultBadge: {
      backgroundColor: isDarkMode ? '#1B2E1B' : '#E8F5E9',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    defaultText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.success,
      fontFamily: 'Poppins-SemiBold',
    },
    paymentDetails: {
      fontSize: 14,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      marginBottom: 2,
    },
    expiryText: {
      fontSize: 12,
      color: colors.text.light,
      fontFamily: 'Poppins-Regular',
    },
    moreButton: {
      padding: 4,
    },
    addMethodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addMethodIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F8F8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    addMethodText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
      fontFamily: 'Poppins-Medium',
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1B2E1B' : '#E8F5E9',
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.success,
      fontFamily: 'Poppins-Regular',
      marginLeft: 12,
      lineHeight: 20,
    },
  });

  const PaymentCard = ({ method }) => {
    const isCard = method.type === 'card';
    const icon = isCard ? 'card' : 'logo-google';

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentIconContainer}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>

        <View style={styles.paymentInfo}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentName}>{method.name}</Text>
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>{t('default')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.paymentDetails}>
            {isCard ? `•••• •••• •••• ${method.lastFour}` : method.upiId}
          </Text>
          {isCard && (
            <Text style={styles.expiryText}>{t('expires')} {method.expiry}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('paymentMethods')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('savedMethods')}</Text>
          {paymentMethods.map(method => (
            <PaymentCard key={method.id} method={method} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addPaymentMethod')}</Text>

          <TouchableOpacity style={styles.addMethodButton}>
            <View style={styles.addMethodIconContainer}>
              <Ionicons name="card-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.addMethodText}>{t('addDebitCreditCard')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addMethodButton}>
            <View style={styles.addMethodIconContainer}>
              <Ionicons name="logo-google" size={22} color={colors.primary} />
            </View>
            <Text style={styles.addMethodText}>{t('addUPI')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addMethodButton}>
            <View style={styles.addMethodIconContainer}>
              <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.addMethodText}>{t('linkWallet')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </TouchableOpacity>
        </View>

        {/* Security Assurance Info */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          <Text style={styles.infoText}>{t('paymentInfoSecure')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;
