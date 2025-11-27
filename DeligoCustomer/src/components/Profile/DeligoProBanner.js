import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DeligoProBanner = () => {
  return (
    <TouchableOpacity style={styles.proBanner} activeOpacity={0.85}>
      <View style={styles.proContent}>
        <View style={styles.proIconWrapper}>
          <Ionicons name="diamond" size={28} color="#FFB800" />
        </View>
        <View style={styles.proTextContainer}>
          <View style={styles.proTitleRow}>
            <Text style={styles.proTitle}>Try Deligo Pro</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          </View>
          <Text style={styles.proSubtitle}>Unlimited free delivery + exclusive deals</Text>
          <Text style={styles.proOffer}>🎁 First month free • Save up to $50/month</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={32} color="#FFB800" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  proBanner: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  proContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  proIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  proTextContainer: {
    flex: 1,
  },
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginRight: 8,
  },
  freeBadge: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Poppins-Bold',
  },
  proSubtitle: {
    fontSize: 13,
    color: '#E0E0E0',
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  proOffer: {
    fontSize: 12,
    color: '#FFB800',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default DeligoProBanner;
