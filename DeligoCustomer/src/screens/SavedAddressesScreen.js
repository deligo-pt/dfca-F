import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from '../contexts/LocationContext';
import AddressApi from '../utils/addressApi';
import CustomModal from '../components/CustomModal';

/**
 * SavedAddressesScreen
 * 
 * Manages the user's saved delivery addresses, allowing for addition, deletion,
 * selection, and setting of the default active address.
 */

const SavedAddressesScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user, fetchUserProfile } = useProfile();
  const { selectAddress } = useLocation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAddresses, setLocalAddresses] = useState([]);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '' });
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', onConfirm: null });

  const showModal = (title, message) => setModalConfig({ visible: true, title, message });
  const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  const showConfirm = (title, message, onConfirm) => setConfirmConfig({ visible: true, title, message, onConfirm });
  const hideConfirm = () => setConfirmConfig(prev => ({ ...prev, visible: false }));

  // Memoize styles to prevent re-creation on every render
  const themeStyles = useMemo(() => styles(colors), [colors]);

  // Determine if operating in selection mode
  const { onSelect, selectedId } = route.params || {};

  useEffect(() => {
    if (user?.deliveryAddresses) {
      setLocalAddresses(user.deliveryAddresses);

      // Synchronize active address with LocationContext for checkout consistency
      const activeAddr = user.deliveryAddresses.find(a => a.isActive);
      if (activeAddr) {
        selectAddress({
          ...activeAddr,
          address: activeAddr.street || activeAddr.address, // API uses street
          detailedAddress: activeAddr.detailedAddress || '',
          coordinates: {
            latitude: activeAddr.latitude,
            longitude: activeAddr.longitude
          },
          label: activeAddr.addressType
        });
      }
    }
  }, [user]);


  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  };

  const handleToggleStatus = async (addressId, isActive) => {
    try {
      // Optimistic update: toggle target, and if activating, ensure others are deactivated.
      const updatedLocal = localAddresses.map(addr => {
        if (addressId === addr._id) return { ...addr, isActive: !isActive }; // Toggle target
        if (!isActive) return { ...addr, isActive: false }; // If target is becoming active, force others inactive
        return addr;
      });
      setLocalAddresses(updatedLocal);

      const response = await AddressApi.toggleDeliveryAddressStatus(addressId);

      if (response && response.success) {
        // Ideally refetch or just rely on optimistic
        fetchUserProfile();

        // If turning ON, select this address as current/header address
        if (!isActive) {
          const selected = localAddresses.find(a => a._id === addressId);
          if (selected) {
            // Map to LocationContext format (needs consistency)
            selectAddress({
              ...selected,
              address: selected.street || selected.address, // Mapping 'street' to 'address' for context
              detailedAddress: selected.detailedAddress || '',
              coordinates: {
                latitude: selected.latitude,
                longitude: selected.longitude
              }
            });
            // Also force refresh to align backend state if needed
            fetchUserProfile();
          }
        } else {
          fetchUserProfile();
        }
      } else {
        // Revert if failed
        showModal(t('error'), t('failedToUpdateStatus'));
        setLocalAddresses(user.deliveryAddresses || []);
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      const errMsg = error.response?.data?.message || error.message || t('failedToUpdateStatus');
      showModal(t('error'), errMsg);
      setLocalAddresses(user.deliveryAddresses || []);
    }
  };

  const handleDelete = (addressId) => {
    showConfirm(
      t('deleteAddress'),
      t('areYouSureDeleteAddress'),
      async () => {
        setLoading(true);
        try {
          await AddressApi.deleteDeliveryAddress(addressId);
          await fetchUserProfile();
        } catch (error) {
          console.error('Delete address error:', error);
          const errMsg = error?.response?.data?.message || error?.message || t('failedToDeleteAddress');
          showModal(t('error'), errMsg);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleSelect = async (address) => {
    if (onSelect) {
      // Optimistic Update: Select immediately and navigate back
      const updatedAddress = { ...address, isActive: true };

      // 1. Notify parent listener (e.g. CheckoutScreen)
      onSelect(updatedAddress);

      // 2. Navigate back immediately (Smooth UI)
      navigation.goBack();

      // 3. Sync with backend in background (Fire and Forget)
      if (!address.isActive) {
        try {
          console.log('[SavedAddresses] Background syncing active status for:', address._id);
          await AddressApi.toggleDeliveryAddressStatus(address._id);
          // Optional: Refresh profile silently to keep sync
          fetchUserProfile();
        } catch (err) {
          console.warn('[SavedAddresses] Background sync failed:', err);
          // We don't revert UI here because the user has already moved on. 
          // The local checkout flow will proceed with the selected address object anyway.
        }
      }
    }
  };

  const AddressCard = ({ address }) => {
    const isSelected = selectedId === address._id;
    const isActive = address.isActive;

    return (
      <TouchableOpacity
        style={[
          themeStyles.addressCard,
          (isSelected || isActive) && themeStyles.addressCardActive
        ]}
        onPress={() => onSelect ? handleSelect(address) : handleToggleStatus(address._id, address.isActive)}
        activeOpacity={0.9}
        // disabled={isActive} // Removed to allow interaction even if active (UX clarity)
      >
        <View style={themeStyles.cardContent}>
          {/* Left Icon Section */}
          <View style={[themeStyles.iconWrapper, (isActive || isSelected) && { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons
              name={address.addressType === 'OFFICE' ? 'briefcase' : address.addressType === 'OTHER' ? 'map-marker' : 'home'}
              size={24}
              color={(isActive || isSelected) ? colors.primary : colors.text.secondary}
            />
          </View>

          {/* Middle Text Section */}
          <View style={themeStyles.textContainer}>
            <View style={themeStyles.labelRow}>
              <Text style={themeStyles.labelTitle}>
                {address.label || address.addressType || t('home')}
              </Text>
              {isActive && (
                <View style={themeStyles.activeBadge}>
                  <Text style={themeStyles.activeBadgeText}>{t('primary')}</Text>
                </View>
              )}
            </View>
            <Text style={themeStyles.addressText} numberOfLines={2}>
              {[address.street, address.detailedAddress].filter(Boolean).join(', ')}
            </Text>
            <Text style={themeStyles.subAddressText} numberOfLines={1}>
              {[address.city, address.state, address.country].filter(Boolean).join(', ')}
            </Text>
          </View>

          {/* Right Action Section */}
          <View style={themeStyles.actionSection}>
            {/* If not active and not in select mode, allow delete */}
            {!isActive && !onSelect && (
              <TouchableOpacity
                style={themeStyles.deleteButton}
                onPress={() => handleDelete(address._id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}

            {/* Selection Radio Circle (if in selection mode) */}
            {onSelect && (
              <View style={[themeStyles.radioCircle, isSelected && themeStyles.radioCircleSelected]}>
                {isSelected && <View style={themeStyles.radioInner} />}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[themeStyles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={themeStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={themeStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={themeStyles.headerText}>{t('savedAddresses')}</Text>
        <TouchableOpacity
          style={themeStyles.refreshButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={themeStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 10 }} />}

        {localAddresses.length === 0 && !loading ? (
          <View style={themeStyles.emptyState}>
            <View style={themeStyles.emptyStateIcon}>
              <Ionicons name="map-outline" size={64} color={colors.primary + '40'} />
            </View>
            <Text style={themeStyles.emptyStateTitle}>{t('noAddressesYet')}</Text>
            <Text style={themeStyles.emptyStateText}>{t('saveAddressesToCheckOut')}</Text>
          </View>
        ) : (
          localAddresses.map(address => (
            <AddressCard key={address._id} address={address} />
          ))
        )}

        {/* Add New Address Button */}
        <TouchableOpacity
          style={themeStyles.addAddressButton}
          onPress={() => navigation.navigate('LocationAddress', {
            mode: 'add_delivery_address',
            onSave: () => fetchUserProfile()
          })}
        >
          <View style={themeStyles.addIconContainer}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
          <Text style={themeStyles.addAddressText}>{t('addNewAddress')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideModal}
      >
        <View style={themeStyles.modalOverlay}>
          <View style={themeStyles.modalContent}>
            <View style={themeStyles.modalIconContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={themeStyles.modalTitle}>{modalConfig.title}</Text>
            <Text style={themeStyles.modalMessage}>{modalConfig.message}</Text>
            <TouchableOpacity
              style={[themeStyles.modalButton, { backgroundColor: colors.primary }]}
              onPress={hideModal}
            >
              <Text style={themeStyles.modalButtonText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideConfirm}
      >
        <View style={themeStyles.modalOverlay}>
          <View style={themeStyles.modalContent}>
            <View style={[themeStyles.modalIconContainer, { backgroundColor: '#FFF5F5' }]}>
              <Ionicons name="trash-outline" size={48} color={colors.error} />
            </View>
            <Text style={themeStyles.modalTitle}>{confirmConfig.title}</Text>
            <Text style={themeStyles.modalMessage}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[themeStyles.modalButton, { backgroundColor: colors.border, flex: 1 }]}
                onPress={hideConfirm}
              >
                <Text style={[themeStyles.modalButtonText, { color: colors.text.primary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[themeStyles.modalButton, { backgroundColor: colors.error, flex: 1 }]}
                onPress={() => {
                  hideConfirm();
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                }}
              >
                <Text style={themeStyles.modalButtonText}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View >
  );
};

const styles = (colors) => StyleSheet.create({
  // ... existing styles ...
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  addressCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  labelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  addressText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Medium',
    lineHeight: 20,
  },
  subAddressText: {
    fontSize: 12,
    color: colors.text.light,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  actionSection: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addIconContainer: {
    marginRight: 8,
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default SavedAddressesScreen;
