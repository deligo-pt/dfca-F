import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';

const CheckoutScreen = ({ route, navigation }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { cartData } = route.params || {};
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [notes, setNotes] = useState('');

  const cartItems = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;
  const deliveryFee = cartData?.deliveryFee || 0;
  const serviceFee = cartData?.serviceFee || 1.99;
  const discount = cartData?.discount || 0;
  const total = cartData?.total || 0;
  const paymentMethods = [
    {
      id: 'card',
      name: t('creditDebitCard'),
      icon: 'credit-card-outline',
      badge: t('recommended'),
    },
    {
      id: 'cash',
      name: t('cashOnDelivery'),
      icon: 'cash',
      details: t('payWhenReceive'),
    },
    { id: 'wallet', name: t('digitalWallet'), icon: 'wallet' },
  ];

  const tipOptions = [
    { id: 0, label: t('noTip'), value: 0 },
    { id: 1, label: '€2', value: 2 },
    { id: 2, label: '€3', value: 3 },
    { id: 3, label: '€5', value: 5 },
  ];

  const handlePlaceOrder = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Orders' } }],
        });
      }, 2000);
    }, 1500);
  };

  const renderSuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>{t('orderPlaced')}</Text>
          <Text style={styles.successMessage}>{t('orderConfirmed')}</Text>
          <View style={styles.successDetails}>
            <Text style={styles.successDetailText}>{t('estimatedDeliveryTime')}: 25-35 {t('min')}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderProcessingModal = () => (
    <Modal visible={isProcessing} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.processingModal}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
          <Text style={styles.processingText}>{t('processing')}</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('checkout')}</Text>
          <Text style={styles.headerSubtitle}>
            {cartItems.length} {t('items')} • {t('estimated')} 25-35 {t('min')}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Delivery Time Banner */}
        <View style={styles.deliveryTimeBanner}>
          <View style={styles.deliveryTimeIcon}>
            <MaterialCommunityIcons name="timer-sand" size={28} color={colors.primary} />
          </View>
          <View style={styles.deliveryTimeContent}>
            <Text style={styles.deliveryTimeLabel}>{t('deliveryTime')}</Text>
            <Text style={styles.deliveryTimeValue}>25-35 {t('min')}</Text>
          </View>
          <View style={styles.deliveryTimeBadge}>
            <Ionicons name="flash" size={14} color="#FFA000" />
            <Text style={styles.deliveryTimeBadgeText}>{t('fast')}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('deliveryTo')}</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.changeButton}>{t('change')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressContainer}>
            <View style={styles.addressIconWrapper}>
              <MaterialCommunityIcons name="home-variant" size={24} color={colors.primary} />
            </View>
            <View style={styles.addressDetails}>
              <Text style={styles.addressType}>{t('home')}</Text>
              <Text style={styles.addressFull}>
                456 Park Avenue, Apartment 5B, 2nd Floor
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Instructions */}
        {false && ( // Replace 'false' with actual condition for deliveryInstructions
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionsBadge}>
              <Ionicons name="alert-circle" size={16} color="#0288D1" />
              <Text style={styles.instructionsText}>Delivery instructions go here</Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('yourOrder')}</Text>
            </View>
            <Text style={styles.itemCount}>{cartItems.length} {t('items')}</Text>
          </View>
          <View style={styles.orderItemsContainer}>
            {cartItems.map((item, index) => (
              <View key={index} style={styles.orderItemRow}>
                <View style={styles.orderItemLeft}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemNameText} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.itemPriceText}>
                  €{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Voucher */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.voucherButton}
            onPress={() => setShowVoucherInput(!showVoucherInput)}
            activeOpacity={0.7}
          >
            <View style={styles.voucherLeft}>
              <View style={styles.voucherIconBadge}>
                <MaterialCommunityIcons
                  name="ticket-percent"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.voucherButtonText}>
                {voucherCode ? t('voucherApplied') : t('applyVoucher')}
              </Text>
            </View>
            <Ionicons
              name={showVoucherInput ? 'chevron-up' : 'chevron-forward'}
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          {showVoucherInput && (
            <View style={styles.voucherInputContainer}>
              <TextInput
                style={styles.voucherInput}
                placeholder={t('enterPromoCode')}
                placeholderTextColor={colors.text.light}
                value={voucherCode}
                onChangeText={setVoucherCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.applyVoucherButton} activeOpacity={0.8}>
                <Text style={styles.applyVoucherText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Rider Tip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="bike-fast" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('tipYourRider')}</Text>
            </View>
            <Text style={styles.optionalText}>{t('optional')}</Text>
          </View>
          <Text style={styles.tipDescription}>
            {t('showAppreciation')}
          </Text>
          <View style={styles.tipOptionsContainer}>
            {tipOptions.map((tip) => (
              <TouchableOpacity
                key={tip.id}
                style={[
                  styles.tipOption,
                  selectedTip === tip.value && styles.tipOptionSelected,
                ]}
                onPress={() => setSelectedTip(tip.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tipOptionText,
                    selectedTip === tip.value && styles.tipOptionTextSelected,
                  ]}
                >
                  {tip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>{t('paymentMethod')}</Text>
            </View>
          </View>
          <View style={styles.paymentMethodsList}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPayment === method.id && styles.paymentMethodCardSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodLeft}>
                  <View
                    style={[
                      styles.paymentMethodIcon,
                      selectedPayment === method.id && styles.paymentMethodIconSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={method.icon}
                      size={24}
                      color={
                        selectedPayment === method.id
                          ? colors.primary
                          : colors.text.secondary
                      }
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <View style={styles.paymentMethodNameRow}>
                      <Text style={styles.paymentMethodName}>{method.name}</Text>
                      {method.badge && selectedPayment === method.id && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>{method.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.paymentMethodDetails}>{method.details}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.paymentRadio,
                    selectedPayment === method.id && styles.paymentRadioSelected,
                  ]}
                >
                  {selectedPayment === method.id && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('addNote')}</Text>
            </View>
            <Text style={styles.optionalText}>{t('optional')}</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder={t('specialInstructions')}
            placeholderTextColor={colors.text.light}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="receipt-text"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>{t('paymentSummary')}</Text>
            </View>
          </View>

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
              <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('deliveryFee')}</Text>
              {deliveryFee === 0 ? (
                <Text style={styles.summaryValueFree}>{t('free')}</Text>
              ) : (
                <Text style={styles.summaryValue}>€{deliveryFee.toFixed(2)}</Text>
              )}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('serviceFee')}</Text>
              <Text style={styles.summaryValue}>€{serviceFee.toFixed(2)}</Text>
            </View>

            {selectedTip > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('riderTip')}</Text>
                <Text style={styles.summaryValue}>€{selectedTip.toFixed(2)}</Text>
              </View>
            )}

            {discount > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.discountRow}>
                  <MaterialCommunityIcons
                    name="ticket-percent"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.summaryLabelDiscount}>{t('discount')}</Text>
                </View>
                <Text style={styles.summaryValueDiscount}>-€{discount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.totalSummaryRow}>
              <Text style={styles.totalSummaryLabel}>{t('total')}</Text>
              <Text style={styles.totalSummaryValue}>
                €{(total + selectedTip).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Place Order Button - Inside ScrollView */}
        <View style={styles.checkoutButtonContainer}>
          <View style={styles.totalBarInline}>
            <Text style={styles.totalBarLabel}>{t('total')}</Text>
            <Text style={styles.totalBarAmount}>€{(total + selectedTip).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.placeOrderBtn,
              isProcessing && styles.placeOrderBtnDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.placeOrderBtnText}>
              {isProcessing ? t('processing') : t('placeOrder')}
            </Text>
            <View style={styles.placeOrderArrow}>
              <Ionicons
                name={isProcessing ? 'hourglass-outline' : 'arrow-forward'}
                size={20}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing for safe area */}
        <View style={{ height: Math.max(100, insets.bottom + 90) }} />
      </ScrollView>

      {renderProcessingModal()}
      {renderSuccessModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ...existing code...
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F8F9FB',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  deliveryTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  deliveryTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deliveryTimeContent: {
    flex: 1,
  },
  deliveryTimeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  deliveryTimeValue: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  deliveryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  deliveryTimeBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#F57C00',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  changeButton: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  itemCount: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  optionalText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: colors.text.light,
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIconWrapper: {
    marginRight: spacing.md,
  },
  addressIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDetails: {
    flex: 1,
  },
  addressType: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  addressFull: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: 21,
  },
  instructionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  instructionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0288D1',
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#0277BD',
    marginLeft: 10,
    lineHeight: 19,
  },
  orderItemsContainer: {
    gap: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FB',
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.md,
  },
  quantityBadge: {
    backgroundColor: colors.primary,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  quantityText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  itemNameText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    lineHeight: 22,
  },
  itemPriceText: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  voucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voucherIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  voucherButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  voucherInputContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  applyVoucherButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyVoucherText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  tipDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tipOptionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tipOption: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  tipOptionSelected: {
    backgroundColor: '#FFF0F5',
    borderColor: colors.primary,
  },
  tipOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.secondary,
  },
  tipOptionTextSelected: {
    color: colors.primary,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#F8F9FB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    backgroundColor: '#FFF5F8',
    borderColor: colors.primary,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentMethodIconSelected: {
    backgroundColor: '#FFE8F0',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  paymentMethodName: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  recommendedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  paymentMethodDetails: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  paymentRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioSelected: {
    borderColor: colors.primary,
  },
  paymentRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  notesInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: '#E8EAED',
    minHeight: 80,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  summaryRows: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  summaryValueFree: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabelDiscount: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#4CAF50',
  },
  summaryValueDiscount: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginVertical: 6,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalSummaryLabel: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  totalSummaryValue: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  checkoutButtonContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: 12,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  totalBarInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalBarLeft: {
    flex: 1,
  },
  totalBarLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  totalBarAmount: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  placeOrderArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  processingModal: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  processingText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 23,
  },
  successDetails: {
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
  },
  successDetailText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginBottom: 4,
  },
});

export default CheckoutScreen;
