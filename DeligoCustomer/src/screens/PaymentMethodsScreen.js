import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const PaymentMethodsScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  // Accept the initially selected ID if navigating from Checkout
  const initialSelected = route?.params?.selectedId || 'CARD';
  const [selectedMethod, setSelectedMethod] = useState(initialSelected);

  const methods = [
    {
      id: 'CARD',
      name: t('creditDebitCard') || 'Credit/Debit Card',
      icon: 'credit-card-outline',
      badge: t('recommended') || 'Recommended',
    },
    {
      id: 'MB_WAY',
      name: 'MB WAY',
      icon: 'cellphone-nfc'
    },
    {
      id: 'APPLE_PAY',
      name: 'Apple Pay',
      icon: 'apple'
    },
    {
      id: 'OTHER',
      name: t('otherMethods') || 'Other Methods',
      icon: 'dots-horizontal-circle-outline'
    },
  ];

  const handleSelect = (method) => {
    setSelectedMethod(method.id);
    if (route?.params?.onSelect) {
      // Small timeout so the user sees the radio button visually update before the screen slides out
      setTimeout(() => {
        route.params.onSelect(method);
        navigation.goBack();
      }, 250);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : '#F8F9FA', // elegant faint gray background for contrast
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
      paddingTop: 24,
    },
    mainCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      // Premium shadow matches the provided inspiration image
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    cardHeaderTitle: {
      fontSize: 17,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
      marginLeft: 10,
    },
    methodRowSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: isDarkMode ? 'rgba(217, 27, 92, 0.15)' : 'rgba(217, 27, 92, 0.04)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    methodRowUnselected: {
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: 'transparent',
      borderWidth: 1.5,
      backgroundColor: 'transparent',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    iconCircleSelected: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      backgroundColor: 'transparent',
    },
    iconCircleUnselected: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      backgroundColor: 'transparent',
    },
    methodName: {
      fontSize: 15,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
      flex: 1,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      marginRight: 14,
      // Adding negative z-index slightly to match image overlap aesthetics loosely, or just tight margins
    },
    badgeText: {
      color: '#FFF',
      fontSize: 10,
      fontFamily: 'Poppins-Bold',
      textTransform: 'none',
      letterSpacing: 0.5,
    },
    radioContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioUnselected: {
      borderColor: colors.border,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* App Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('paymentMethods') || 'Payment Methods'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mainCard}>
          {/* Card Header matching image */}
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="credit-card-outline" size={22} color={colors.primary} />
            <Text style={styles.cardHeaderTitle}>{t('paymentMethod') || 'Payment method'}</Text>
          </View>

          {/* Methods List */}
          {methods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={isSelected ? styles.methodRowSelected : styles.methodRowUnselected}
                onPress={() => handleSelect(method)}
                activeOpacity={0.8}
              >
                {/* Left Icon Layout exactly like image */}
                <View style={isSelected ? styles.iconCircleSelected : styles.iconCircleUnselected}>
                  <MaterialCommunityIcons
                    name={method.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.text.secondary}
                  />
                </View>

                {/* Name */}
                <Text style={styles.methodName}>{method.name}</Text>

                {/* Recommended Badge */}
                {method.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{method.badge}</Text>
                  </View>
                )}

                {/* Radio Button */}
                <View style={[styles.radioContainer, isSelected ? styles.radioSelected : styles.radioUnselected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;
