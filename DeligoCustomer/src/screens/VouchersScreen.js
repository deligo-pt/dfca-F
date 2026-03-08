/**
 * VouchersScreen
 * 
 * Manages the display, selection, and application of vouchers and promo codes.
 * Supports viewing active/expired coupons and manual code entry.
 */

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
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, colors } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import formatCurrency from '../utils/currency';
import CouponAPI from '../utils/couponApi';

const VouchersScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const { selectionMode, vendorId, onSelect, currentTotal } = route.params || {};

  const [activeTab, setActiveTab] = useState('available');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    // Retrieve coupons from backend
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
    // Handle coupon selection or display details
    setSelectedVoucher(coupon);
  };

  const handleVerifyManualCode = async () => {
    const code = manualCode.trim();
    if (!code) return;

    setVerifying(true);

    // 1. Verify against locally available coupons
    const foundLocal = coupons.find(c => c.code && c.code.toLowerCase() === code.toLowerCase());

    if (foundLocal) {
      setVerifying(false);
      if (selectionMode && onSelect) {
        onSelect(foundLocal);
        navigation.goBack();
      } else {
        // Notify availability
        Alert.alert(t('success'), t('couponAvailable'));
      }
      return;
    }

    // 2. Attempt server-side validation and application
    const res = await CouponAPI.applyCoupon(code, 'CART', true); // isCode=true
    setVerifying(false);

    if (res.success) {
      if (selectionMode && onSelect) {
        // return successful code application result
        onSelect(null, res.data);
        navigation.goBack();
      } else {
        Alert.alert(t('success'), t('couponApplied'));
      }
    } else {
      Alert.alert(t('error'), res.error || t('invalidPromoCode'));
    }
  };

  const VoucherCard = ({ voucher }) => {
    const isExpired = activeTab === 'expired';

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
                {voucher.code || voucher.offerCode || voucher.promoCode || 'N/A'}
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

  // Filter coupons by status
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

      {/* Custom Voucher Code Modal */}
      <Modal
        visible={!!selectedVoucher}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVoucher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="gift-outline" size={32} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={() => setSelectedVoucher(null)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>
              {selectedVoucher?.name || selectedVoucher?.title || t('voucherDetail') || 'Voucher Code'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedVoucher?.description || selectedVoucher?.subtitle || 'Use this code to get a discount on your order!'}
            </Text>

            <View style={styles.modalCodeSection}>
              <Text style={styles.modalCodeLabel}>{t('code') || 'Coupon Code'}</Text>
              <View style={styles.modalCodeBox}>
                <Text style={styles.modalCodeText} selectable={true}>
                  {selectedVoucher?.code || selectedVoucher?.offerCode || selectedVoucher?.promoCode || t('noCodeAvailable') || 'N/A'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setSelectedVoucher(null)}
            >
              <Text style={styles.modalPrimaryButtonText}>{t('gotIt') || 'Got It'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    right: -8,
    top: -8,
    padding: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  modalCodeSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalCodeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCodeBox: {
    backgroundColor: colors.background === '#FFFFFF' ? '#F8F9FA' : '#2A2A2A',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalCodeText: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    letterSpacing: 2,
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});

export default VouchersScreen;
