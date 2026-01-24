import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, colors } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import CouponAPI from '../utils/couponApi';

const VouchersScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { selectionMode, vendorId, onSelect, currentTotal } = route.params || {};

  const [activeTab, setActiveTab] = useState('available');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    // Fetch availble coupons from API
    const res = await CouponAPI.getCoupons(vendorId);
    if (res.success && Array.isArray(res.data)) {
      setCoupons(res.data);
    } else {
      console.warn('Failed to fetch coupons or invalid format', res);
      // Fallback or empty state
    }
    setLoading(false);
  };

  const handleApply = async (coupon) => {
    if (selectionMode && onSelect) {
      onSelect(coupon);
      navigation.goBack();
      return;
    }
    // If not in selection mode (e.g. from Profile), maybe just copy code or show detail?
    // For now, no-op or alert
    Alert.alert(t('couponCode'), `${t('code')}: ${coupon.code}`);
  };

  const handleVerifyManualCode = async () => {
    if (!manualCode.trim()) return;
    setVerifying(true);

    // First verification step
    const res = await CouponAPI.verifyCode(manualCode);
    setVerifying(false);

    if (res.success) {
      // If code is valid, and we are in selection mode, apply it immediately
      if (selectionMode && onSelect) {
        onSelect(res.data); // Assuming data is the coupon object
        navigation.goBack();
      } else {
        Alert.alert(t('success'), t('couponValid'));
      }
    } else {
      Alert.alert(t('error'), res.error || t('invalidPromoCode'));
    }
  };

  const VoucherCard = ({ voucher }) => {
    const isExpired = activeTab === 'expired'; // Or check expiry date logic
    // const isExpired = voucher.isActive === false; 

    return (
      <View style={[styles.voucherCard, isExpired && styles.voucherCardExpired]}>
        <View style={styles.voucherLeft}>
          <View style={[styles.voucherIconContainer, isExpired && styles.voucherIconExpired]}>
            <Ionicons name="pricetag" size={24} color={isExpired ? colors.text.light : colors.primary} />
          </View>
        </View>

        <View style={styles.voucherContent}>
          <Text style={[styles.voucherTitle, isExpired && styles.textExpired]}>
            {voucher.name || voucher.title || 'Offer'}
          </Text>
          <Text style={[styles.voucherSubtitle, isExpired && styles.textExpired]}>
            {voucher.description || voucher.subtitle}
          </Text>

          <View style={styles.voucherCodeContainer}>
            <View style={[styles.voucherCodeBadge, isExpired && styles.voucherCodeBadgeExpired]}>
              <Text style={[styles.voucherCode, isExpired && styles.textExpired]}>
                {voucher.code}
              </Text>
            </View>
            <Text style={[styles.voucherExpiry, isExpired && styles.textExpired]}>
              {/* Format date if available */}
              {voucher.expiryDate ? new Date(voucher.expiryDate).toLocaleDateString() : ''}
            </Text>
          </View>
        </View>

        {!isExpired && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => handleApply(voucher)}
          >
            <Text style={styles.applyButtonText}>
              {selectionMode ? t('apply') : t('view')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Filter local logic if API returns mixed list
  // Assuming API might return all, so we filter by 'isActive' or similar
  const availableVouchers = coupons.filter(c => c.isActive !== false);
  const expiredVouchers = coupons.filter(c => c.isActive === false);

  const displayedVouchers = activeTab === 'available' ? availableVouchers : expiredVouchers;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {selectionMode ? t('applyVoucher') : t('vouchers')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Manual Code Input (Only in Selection Mode) */}
      {selectionMode && (
        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>{t('enterPromoCode')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="PROMO2025"
              placeholderTextColor={colors.text.light}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.verifyButton, !manualCode.trim() && styles.verifyButtonDisabled]}
              disabled={!manualCode.trim() || verifying}
              onPress={handleVerifyManualCode}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.verifyButtonText}>{t('apply')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs - Only show if not in selection mode or simple list needed */}
      {!selectionMode && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
              {t('available')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
            onPress={() => setActiveTab('expired')}
          >
            <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
              {t('expired')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {displayedVouchers.length > 0 ? (
              displayedVouchers.map((voucher, index) => (
                <VoucherCard key={voucher.id || index} voucher={voucher} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="ticket-outline" size={64} color={colors.text.light} />
                <Text style={styles.emptyText}>
                  {activeTab === 'available' ? t('noVouchersAvailable') : t('noExpiredVouchers')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  inputSection: {
    padding: 16,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.text.light,
  },
  verifyButtonText: {
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 16,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  voucherCardExpired: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  voucherLeft: {
    marginRight: 16,
  },
  voucherIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherContent: {
    flex: 1,
  },
  voucherTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  voucherSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  voucherCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voucherCodeBadge: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CE93D8',
    borderStyle: 'dashed',
  },
  voucherCode: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#8E24AA',
  },
  voucherExpiry: {
    fontSize: 11,
    color: colors.text.light,
    fontFamily: 'Poppins-Regular',
  },
  applyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#2E7D32',
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Medium',
  },
  textExpired: {
    color: colors.text.light,
  },
});

export default VouchersScreen;
