import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useLanguage } from '../utils/LanguageContext';

const VouchersScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('available');

  const vouchers = [
    {
      id: 1,
      title: '50% OFF',
      subtitle: 'On orders above €299',
      code: 'DELIGO50',
      expiryDate: 'Valid till Dec 31, 2025',
      type: 'available',
    },
    {
      id: 2,
      title: 'Free Delivery',
      subtitle: 'No minimum order',
      code: 'FREEDEL',
      expiryDate: 'Valid till Nov 30, 2025',
      type: 'available',
    },
    {
      id: 3,
      title: '€100 OFF',
      subtitle: 'On orders above €500',
      code: 'SAVE100',
      expiryDate: 'Expired on Oct 20, 2025',
      type: 'expired',
    },
  ];

  const VoucherCard = ({ voucher }) => {
    const isExpired = voucher.type === 'expired';

    return (
      <View style={[styles.voucherCard, isExpired && styles.voucherCardExpired]}>
        <View style={styles.voucherLeft}>
          <View style={[styles.voucherIconContainer, isExpired && styles.voucherIconExpired]}>
            <Ionicons name="ticket" size={32} color={isExpired ? colors.text.light : colors.primary} />
          </View>
        </View>

        <View style={styles.voucherContent}>
          <Text style={[styles.voucherTitle, isExpired && styles.textExpired]}>{voucher.title}</Text>
          <Text style={[styles.voucherSubtitle, isExpired && styles.textExpired]}>{voucher.subtitle}</Text>

          <View style={styles.voucherCodeContainer}>
            <View style={[styles.voucherCodeBadge, isExpired && styles.voucherCodeBadgeExpired]}>
              <Text style={[styles.voucherCode, isExpired && styles.textExpired]}>{voucher.code}</Text>
            </View>
            <Text style={[styles.voucherExpiry, isExpired && styles.textExpired]}>{voucher.expiryDate}</Text>
          </View>
        </View>

        {!isExpired && (
          <TouchableOpacity style={styles.applyButton}>
            <Text style={styles.applyButtonText}>{t('apply')}</Text>
          </TouchableOpacity>
        )}

        {isExpired && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredText}>{t('expired')}</Text>
          </View>
        )}
      </View>
    );
  };

  const availableVouchers = vouchers.filter(v => v.type === 'available');
  const expiredVouchers = vouchers.filter(v => v.type === 'expired');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} // Simplistic, ideally use useTheme().isDarkMode if available, assuming colors.isDarkMode works or default
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('vouchers')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            {t('available')} ({availableVouchers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
          onPress={() => setActiveTab('expired')}
        >
          <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
            {t('expired')} ({expiredVouchers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'available' ? (
          availableVouchers.length > 0 ? (
            availableVouchers.map(voucher => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyText}>{t('noVouchersAvailable')}</Text>
              <Text style={styles.emptySubtext}>{t('checkBackLater')}</Text>
            </View>
          )
        ) : (
          expiredVouchers.length > 0 ? (
            expiredVouchers.map(voucher => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyText}>{t('noExpiredVouchers')}</Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    fontFamily: 'Poppins-Medium',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  voucherCardExpired: {
    opacity: 0.6,
  },
  voucherLeft: {
    width: 80,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherIconExpired: {
    backgroundColor: '#F5F5F5',
  },
  voucherContent: {
    flex: 1,
    padding: 16,
  },
  voucherTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  voucherSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginBottom: 12,
  },
  voucherCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voucherCodeBadge: {
    backgroundColor: '#FFF0F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  voucherCodeBadgeExpired: {
    backgroundColor: '#F5F5F5',
    borderColor: colors.text.light,
  },
  voucherCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },
  voucherExpiry: {
    fontSize: 12,
    color: colors.text.light,
    fontFamily: 'Poppins-Regular',
  },
  textExpired: {
    color: colors.text.light,
  },
  applyButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.white,
    fontFamily: 'Poppins-SemiBold',
  },
  expiredBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.light,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.light,
    fontFamily: 'Poppins-Regular',
    marginTop: 8,
  },
});

export default VouchersScreen;
