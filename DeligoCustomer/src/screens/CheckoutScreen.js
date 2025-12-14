import React, { useState, useEffect } from 'react';
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
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import formatCurrency from '../utils/currency';
import { setupPaymentSheet, openPaymentSheet } from '../utils/stripeService';
import CheckoutAPI from '../utils/checkoutApi';
import OrderAPI from '../utils/orderApi';

// Helper component to display location from context
const ConsumerLocationDisplay = ({ colors, t }) => {
  const { address, detailedAddress, city, postalCode, label } = useLocation();
  const displayAddress = address || t('selectAddress');

  // Construct the full address line
  const details = [
    detailedAddress,
    city,
    postalCode
  ].filter(part => part && part.trim()).join(', ');

  return (
    <View style={styles(colors).addressContainer}>
      <View style={styles(colors).addressIconWrapper}>
        <MaterialCommunityIcons name={label === 'Work' ? 'briefcase' : label === 'Other' ? 'map-marker' : 'home-variant'} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).addressDetails}>
        <Text style={styles(colors).addressType}>{label || t('home')}</Text>
        <Text style={styles(colors).addressFull}>
          {displayAddress}
        </Text>
        {details ? (
          <Text style={[styles(colors).addressFull, { fontSize: 13, color: colors.text.secondary, marginTop: 2 }]}>
            {details}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const CheckoutScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { cartData } = route.params || {};

  // Checkout response state (created on this screen, not passed from CartDetail)
  const [checkoutResponse, setCheckoutResponse] = useState(null);
  const [initializingCheckout, setInitializingCheckout] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeError, setStripeError] = useState(null);

  // Get real cart data from CartContext
  const { getVendorCart } = useCart();
  const vendorId = cartData?.vendorId;
  const cart = getVendorCart(vendorId);

  // Create checkout on mount (payment integration happens here, not in CartDetail)
  useEffect(() => {
    let canceled = false;

    const createCheckoutOnEnter = async () => {
      try {
        setInitializingCheckout(true);
        console.debug('[CheckoutScreen] Creating checkout via API with useCart=true');

        const res = await CheckoutAPI.createCheckout(true);
        console.debug('[CheckoutScreen] createCheckout result:', res);

        if (canceled) return;

        if (!res.success) {
          setStripeError(res.error || 'Failed to initialize checkout');
          setInitializingCheckout(false);
          return;
        }

        // Store response for Stripe initialization
        setCheckoutResponse(res.data);
      } catch (err) {
        console.error('[CheckoutScreen] createCheckout error:', err);
        if (!canceled) {
          setStripeError(err?.message || 'Failed to create checkout');
        }
      } finally {
        if (!canceled) {
          setInitializingCheckout(false);
        }
      }
    };

    createCheckoutOnEnter();

    return () => {
      canceled = true;
    };
  }, []);

  // Calculate real cart values
  const cartItems = cart?.items ? Object.keys(cart.items).map(id => {
    const p = cart.items[id].product;
    const rawPricing = p?._raw?.pricing || p?.pricing || null;
    const basePrice = Number((rawPricing && rawPricing.price) ?? p.price ?? 0) || 0;
    const discountRaw = rawPricing?.discount;
    const taxRaw = rawPricing?.tax;
    const discountPercent = (discountRaw != null && !isNaN(Number(discountRaw))) ? (Number(discountRaw) <= 1 ? Number(discountRaw) * 100 : Number(discountRaw)) : 0;
    const taxPercent = (taxRaw != null && !isNaN(Number(taxRaw))) ? (Number(taxRaw) <= 1 ? Number(taxRaw) * 100 : Number(taxRaw)) : (Number(cart?.vendorMeta?.taxRate ?? 0) * 100);
    const finalUnitFromPricing = rawPricing && rawPricing.finalPrice != null ? Number(rawPricing.finalPrice) : null;
    const computedFinalUnit = basePrice * (1 - (discountPercent / 100)) * (1 + (taxPercent / 100));
    const finalUnitPrice = Number.isFinite(finalUnitFromPricing) ? finalUnitFromPricing : computedFinalUnit;

    return ({
      id,
      name: p?.name,
      price: basePrice,
      finalPrice: finalUnitPrice,
      discountPercent,
      taxPercent,
      quantity: cart.items[id].quantity,
      image: p?.image,
      currency: (rawPricing && rawPricing.currency) || p?.currency,
    });
  }) : (cartData?.items || []);

  const currency = cartItems.length > 0 ? (cartItems[0].currency || 'EUR') : 'EUR';
  // Compute item-level subtotal (after item discounts, before tax) and tax
  const itemsSubtotal = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitTaxable = (it.price || 0) - unitDiscount;
    return sum + unitTaxable * (it.quantity || 0);
  }, 0);
  const itemsTax = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitTaxable = (it.price || 0) - unitDiscount;
    const unitTax = unitTaxable * ((it.taxPercent || 0) / 100);
    return sum + unitTax * (it.quantity || 0);
  }, 0);

  // Fees and promo discount
  const deliveryFee = cartData?.deliveryFee || 0;
  const serviceFee = cartData?.serviceFee || 1.99;
  const discount = cart?.appliedPromo?.discount || cartData?.discount || 0;

  // Build baseSubtotal/discountTotal/taxAmount/total to match CartDetail
  const baseSubtotal = cartItems.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
  const discountTotal = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    return sum + unitDiscount * (it.quantity || 0);
  }, 0);
  const subtotalAfterDiscount = baseSubtotal - discountTotal;
  const taxAmount = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitTaxable = (it.price || 0) - unitDiscount;
    const unitTax = unitTaxable * ((it.taxPercent || 0) / 100);
    return sum + unitTax * (it.quantity || 0);
  }, 0);
  const total = subtotalAfterDiscount + taxAmount;

  // Set initial notes from cart delivery instructions
  useEffect(() => {
    if (cart?.deliveryInstructions) {
      setNotes(cart.deliveryInstructions);
    }
  }, [cart?.deliveryInstructions]);

  const paymentMethods = [
    {
      id: 'card',
      name: t('creditDebitCard'),
      icon: 'credit-card-outline',
      badge: t('recommended'),
    },
    { id: 'wallet', name: t('digitalWallet'), icon: 'wallet' },
  ];

  // Helper: robustly extract checkoutSummaryId from various backend response shapes
  const extractCheckoutSummaryId = (checkoutResponse) => {
    if (!checkoutResponse || typeof checkoutResponse !== 'object') return null;
    const candidatePaths = [
      // direct keys
      ['CheckoutSummaryId'],
      ['checkoutSummaryId'],
      // nested under data
      ['data', 'CheckoutSummaryId'],
      ['data', 'checkoutSummaryId'],
      // nested summary objects
      ['data', 'checkoutSummary', '_id'],
      ['checkoutSummary', '_id'],
      // alternative snake/camel cases
      ['checkout_summary_id'],
      ['data', 'checkout_summary_id'],
    ];
    for (const path of candidatePaths) {
      let cur = checkoutResponse;
      let ok = true;
      for (const segment of path) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, segment)) {
          cur = cur[segment];
        } else { ok = false; break; }
      }
      if (ok && cur && typeof cur === 'string') return cur;
    }
    // Try case-insensitive scan of top-level keys
    for (const k of Object.keys(checkoutResponse)) {
      if (/checkoutsummaryid/i.test(k)) return checkoutResponse[k];
      const v = checkoutResponse[k];
      if (v && typeof v === 'object') {
        for (const vk of Object.keys(v)) {
          if (/checkoutsummaryid/i.test(vk)) return v[vk];
        }
      }
    }
    return null;
  };

  useEffect(() => {
    let cancelled = false;

    async function initStripe() {
      const checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);

      if (!checkoutSummaryId) {
        console.warn('[CheckoutScreen] No checkoutSummaryId found in checkout response', {
          availableKeys: Object.keys(checkoutResponse || {})
        });
        setStripeError('Checkout session not initialized. Please try again.');
        return;
      }

      const declaredFinalAmount = checkoutResponse?.data?.finalAmount || checkoutResponse?.finalAmount;
      if (declaredFinalAmount && Math.abs(declaredFinalAmount - total) > 0.01) {
        console.debug('[CheckoutScreen] finalAmount mismatch', {
          declaredFinalAmount,
          uiComputedTotal: total
        });
      }

      console.debug('[CheckoutScreen] Initializing Stripe with checkoutSummaryId:', checkoutSummaryId);

      const res = await setupPaymentSheet(checkoutSummaryId);

      if (cancelled) return;

      if (!res.success) {
        // Check if it's a Stripe connection error from backend
        const errorMsg = res.error || '';
        if (errorMsg.includes('StripeConnectionError') || errorMsg.includes('connection to Stripe')) {
          setStripeError('Backend cannot connect to Stripe. Please check server configuration.');
        } else if (errorMsg.includes('Payment intent not found')) {
          setStripeError('Payment setup failed. Please contact support.');
        } else {
          setStripeError(errorMsg);
        }
      } else {
        setStripeReady(true);
      }
    }

    // Initialize Stripe once we have a checkoutResponse
    if (checkoutResponse) {
      initStripe();
    }

    return () => {
      cancelled = true;
    };
  }, [checkoutResponse, total]);

  const handlePlaceOrder = async () => {
    if (!stripeReady) {
      setStripeError(stripeError || 'Payment not ready. Please wait...');
      return;
    }

    const checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);

    if (!checkoutSummaryId) {
      setStripeError('Checkout session expired. Please try again.');
      return;
    }

    setIsProcessing(true);

    // Step 1: Present payment sheet and process payment
    const payRes = await openPaymentSheet();

    if (!payRes.success) {
      setIsProcessing(false);
      setStripeError(payRes.error);
      return;
    }

    // Step 2: Create order with checkoutSummaryId and paymentIntentId
    const { paymentIntentId } = payRes;

    if (!paymentIntentId) {
      console.error('[CheckoutScreen] Payment succeeded but no paymentIntentId returned');
      setIsProcessing(false);
      setStripeError('Payment succeeded but order creation failed. Please contact support.');
      return;
    }

    console.debug('[CheckoutScreen] Creating order with:', { checkoutSummaryId, paymentIntentId });

    const orderRes = await OrderAPI.createOrder(checkoutSummaryId, paymentIntentId);

    if (!orderRes.success) {
      setIsProcessing(false);
      setStripeError(orderRes.error || 'Failed to create order. Please contact support.');
      console.error('[CheckoutScreen] Order creation failed:', orderRes);
      return;
    }

    console.debug('[CheckoutScreen] Order created successfully:', orderRes.data);

    // Step 3: Show success and navigate to orders
    setIsProcessing(false);
    setShowSuccessModal(true);

    setTimeout(() => {
      setShowSuccessModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Orders' } }]
      });
    }, 2000);
  };

  const renderSuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="fade">
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).successModal}>
          <View style={styles(colors).successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles(colors).successTitle}>{t('orderPlaced')}</Text>
          <Text style={styles(colors).successMessage}>{t('orderConfirmed')}</Text>
          <View style={styles(colors).successDetails}>
            <Text style={styles(colors).successDetailText}>{t('estimatedDeliveryTime')}: 25-35 {t('min')}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderProcessingModal = () => (
    <Modal visible={isProcessing} transparent animationType="fade">
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).processingModal}>
          <ActivityIndicator size="large" color={colors.primary} style={styles(colors).loadingSpinner} />
          <Text style={styles(colors).processingText}>{t('processing')}</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles(colors).container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles(colors).headerCenter}>
          <Text style={styles(colors).headerTitle}>{cart?.vendorName || cartData?.vendorName || t('checkout')}</Text>
          <Text style={styles(colors).headerSubtitle}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} • {t('estimated')} 25-35 {t('min')}
          </Text>
        </View>
        <View style={styles(colors).headerRight} />
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {/* Delivery Time Banner */}
        <View style={styles(colors).deliveryTimeBanner}>
          <View style={styles(colors).deliveryTimeIcon}>
            <MaterialCommunityIcons name="timer-sand" size={28} color={colors.primary} />
          </View>
          <View style={styles(colors).deliveryTimeContent}>
            <Text style={styles(colors).deliveryTimeLabel}>{t('deliveryTime')}</Text>
            <Text style={styles(colors).deliveryTimeValue}>25-35 {t('min')}</Text>
          </View>
          <View style={styles(colors).deliveryTimeBadge}>
            <Ionicons name="flash" size={14} color="#FFA000" />
            <Text style={styles(colors).deliveryTimeBadgeText}>{t('fast')}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <Text style={styles(colors).sectionTitle}>{t('deliveryTo')}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('LocationAddress')}
            >
              <Text style={styles(colors).changeButton}>{t('change')}</Text>
            </TouchableOpacity>
          </View>
          <ConsumerLocationDisplay colors={colors} t={t} />
        </View>

        {/* Delivery Instructions */}
        {notes && (
          <View style={styles(colors).instructionsContainer}>
            <View style={styles(colors).instructionsBadge}>
              <Ionicons name="alert-circle" size={16} color="#0288D1" />
              <Text style={styles(colors).instructionsText}>{notes}</Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <Text style={styles(colors).sectionTitle}>{t('yourOrder')}</Text>
            </View>
            <Text style={styles(colors).itemCount}>{cartItems.length} {t('items')}</Text>
          </View>
          <View style={styles(colors).orderItemsContainer}>
            {cartItems.map((item, index) => (
              <View key={item.id || index} style={styles(colors).orderItemRow}>
                <View style={styles(colors).orderItemLeft}>
                  <View style={styles(colors).quantityBadge}>
                    <Text style={styles(colors).quantityText}>{item.quantity}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles(colors).itemNameText} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {/* Pricing breakdown */}
                    <Text style={{ fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.text.secondary, marginTop: 4 }}>
                      {formatCurrency(currency, item.price)}
                      {item.discountPercent > 0 ? ` • -${Math.round(item.discountPercent)}%` : ''}
                      {item.taxPercent > 0 ? ` • +${Math.round(item.taxPercent)}%` : ''}
                      {` • = ${formatCurrency(currency, item.finalPrice || item.price)}`}
                    </Text>
                  </View>
                </View>
                {/* Line total uses final price if available */}
                <Text style={styles(colors).itemPriceText}>
                  {formatCurrency(currency, (item.finalPrice || item.price) * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles(colors).sectionTitle}>{t('paymentMethod')}</Text>
            </View>
          </View>
          <View style={styles(colors).paymentMethodsList}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles(colors).paymentMethodCard,
                  selectedPayment === method.id && styles(colors).paymentMethodCardSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
                activeOpacity={0.7}
              >
                <View style={styles(colors).paymentMethodLeft}>
                  <View
                    style={[
                      styles(colors).paymentMethodIcon,
                      selectedPayment === method.id && styles(colors).paymentMethodIconSelected,
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
                  <View style={styles(colors).paymentMethodInfo}>
                    <View style={styles(colors).paymentMethodNameRow}>
                      <Text style={styles(colors).paymentMethodName}>{method.name}</Text>
                      {method.badge && selectedPayment === method.id && (
                        <View style={styles(colors).recommendedBadge}>
                          <Text style={styles(colors).recommendedBadgeText}>{method.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles(colors).paymentMethodDetails}>{method.details}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles(colors).paymentRadio,
                    selectedPayment === method.id && styles(colors).paymentRadioSelected,
                  ]}
                >
                  {selectedPayment === method.id && (
                    <View style={styles(colors).paymentRadioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add Notes */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <Text style={styles(colors).sectionTitle}>{t('addNote')}</Text>
            </View>
            <Text style={styles(colors).optionalText}>{t('optional')}</Text>
          </View>
          <TextInput
            style={styles(colors).notesInput}
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
        <View style={styles(colors).summarySection}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <MaterialCommunityIcons
                name="receipt-text"
                size={20}
                color={colors.primary}
              />
              <Text style={styles(colors).sectionTitle}>{t('paymentSummary')}</Text>
            </View>
          </View>

          <View style={styles(colors).summaryRows}>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>{t('subtotal')}</Text>
              <Text style={styles(colors).summaryValue}>{formatCurrency(currency, baseSubtotal)}</Text>
            </View>

            {discountTotal > 0 && (
              <View style={styles(colors).summaryRow}>
                <View style={styles(colors).discountRow}>
                  <MaterialCommunityIcons name="ticket-percent" size={16} color={colors.success} />
                  <Text style={styles(colors).summaryLabelDiscount}>{t('discount')}</Text>
                </View>
                <Text style={styles(colors).summaryValueDiscount}>-{formatCurrency(currency, discountTotal)}</Text>
              </View>
            )}

            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>{t('tax')}</Text>
              <Text style={styles(colors).summaryValue}>{formatCurrency(currency, taxAmount)}</Text>
            </View>

            <View style={styles(colors).summaryDivider} />

            <View style={styles(colors).totalSummaryRow}>
              <Text style={styles(colors).totalSummaryLabel}>{t('total')}</Text>
              <Text style={styles(colors).totalSummaryValue}>{formatCurrency(currency, total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Error Banner */}
        {stripeError && (
          <View style={{ backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginHorizontal: spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: '#F44336' }}>
            <Text style={{ color: '#D32F2F', fontFamily: 'Poppins-Medium', fontSize: 13 }}>{stripeError}</Text>
          </View>
        )}

        {/* Checkout Initializing Banner */}
        {initializingCheckout && (
          <View style={{ backgroundColor: '#E3F2FD', padding: 12, borderRadius: 12, marginHorizontal: spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: '#2196F3', flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1976D2" style={{ marginRight: 8 }} />
            <Text style={{ color: '#1565C0', fontFamily: 'Poppins-Medium', fontSize: 13 }}>Preparing checkout...</Text>
          </View>
        )}

        {/* Place Order Button */}
        <View style={styles(colors).checkoutButtonContainer}>
          <View style={styles(colors).totalBarInline}>
            <Text style={styles(colors).totalBarLabel}>{t('total')}</Text>
            <Text style={styles(colors).totalBarAmount}>{formatCurrency(currency, total)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles(colors).placeOrderBtn,
              (isProcessing || initializingCheckout || !stripeReady) && styles(colors).placeOrderBtnDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={isProcessing || initializingCheckout || !stripeReady}
            activeOpacity={0.85}
          >
            <Text style={styles(colors).placeOrderBtnText}>
              {isProcessing
                ? t('processing')
                : initializingCheckout
                  ? 'Preparing...'
                  : !stripeReady
                    ? 'Initializing Payment...'
                    : t('placeOrder')}
            </Text>
            <View style={styles(colors).placeOrderArrow}>
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

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
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
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF8E1' : 'rgba(255, 193, 7, 0.15)',
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
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
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
    backgroundColor: colors.background === '#FFFFFF' ? '#E3F2FD' : 'rgba(33, 150, 243, 0.15)',
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
    borderBottomColor: colors.border,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
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
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyVoucherButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tipOptionSelected: {
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF5F8' : 'rgba(220, 49, 115, 0.1)',
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodIconSelected: {
    backgroundColor: colors.background === '#FFFFFF' ? '#FFE8F0' : 'rgba(220, 49, 115, 0.2)',
    borderColor: colors.primary,
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
    borderColor: colors.text.light,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  summarySection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.border,
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
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: 12,
    marginBottom: 12,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalBarInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  processingModal: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 260,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  successDetailText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginBottom: 4,
  },
});

export default CheckoutScreen;
