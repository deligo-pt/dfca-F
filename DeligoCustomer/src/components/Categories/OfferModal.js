import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { spacing } from '../../theme';

/**
 * OfferModal Component
 *
 * Displays detailed information about a specific promotional offer.
 * Allows identifying the offer via promo code and applying it to the current context.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Controls the visibility of the modal
 * @param {Function} [props.onClose] - Callback function to close the modal
 * @param {Object} [props.offer] - The offer object containing code, discount, title, etc.
 * @param {Function} [props.onApply] - Callback function when the offer is applied
 * @returns {JSX.Element|null} The rendered OfferModal component or null if no offer is provided
 */
export default function OfferModal({ visible, onClose, offer, onApply }) {
  const { colors } = useTheme();

  if (!offer) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.content, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.icon}>🎉</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {offer.title || 'Special Offer'}
            </Text>
          </View>

          <View style={styles.body}>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {offer.subtitle || 'Limited time offer'}
            </Text>

            {offer.code && (
              <View style={styles.promoContainer}>
                <Text style={[styles.promoLabel, { color: colors.text.secondary }]}>Promo Code:</Text>
                <View style={[styles.promoCode, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={styles.promoCodeText}>{offer.code}</Text>
                </View>
                <Text style={[styles.copyHint, { color: colors.text.light }]}>Tap to copy</Text>
              </View>
            )}

            <View style={[
              styles.discountBadge,
              {
                backgroundColor: colors.background === '#FFFFFF' ? '#FFF8E1' : 'rgba(255, 217, 61, 0.15)',
                borderColor: colors.background === '#FFFFFF' ? '#FFD93D' : 'rgba(255, 217, 61, 0.3)'
              }
            ]}>
              <Text style={[styles.discountText, { color: colors.primary }]}>
                {offer.discount || '50%'}
              </Text>
              <Text style={[styles.discountLabel, { color: colors.primary }]}>OFF</Text>
            </View>

            <View style={[styles.terms, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.termsTitle, { color: colors.text.primary }]}>Terms & Conditions:</Text>
              <Text style={[styles.termsText, { color: colors.text.secondary }]}>
                • Valid for first-time users only{"\n"}
                • Minimum order value: €20{"\n"}
                • Not applicable with other offers{"\n"}
                • Valid until: December 31, 2025
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => {
              if (onApply) onApply(offer);
              if (onClose) onClose();
            }}
          >
            <Text style={[styles.applyText, { color: colors.text.white }]}>Apply Offer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 10,
    maxHeight: '80%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
  },
  body: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  promoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  promoLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginBottom: spacing.xs,
  },
  promoCode: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: spacing.xs,
  },
  promoCodeText: {
    fontSize: 24,
    fontFamily: 'Poppins-Black',
    color: '#fff',
    letterSpacing: 2,
  },
  copyHint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  discountBadge: {
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  discountText: {
    fontSize: 48,
    fontFamily: 'Poppins-Black',
    lineHeight: 50,
  },
  discountLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  terms: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
  },
  termsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: spacing.xs,
  },
  termsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});
