import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from '../contexts/LocationContext';
import { customerApi } from '../utils/api';
import AddressApi from '../utils/addressApi';
import { API_ENDPOINTS } from '../constants/config';

const SavedAddressesScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user, fetchUserProfile } = useProfile();
  const { selectAddress } = useLocation(); // Import selectAddress
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAddresses, setLocalAddresses] = useState([]);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '' });
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', onConfirm: null });

  const showModal = (title, message) => setModalConfig({ visible: true, title, message });
  const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  const showConfirm = (title, message, onConfirm) => setConfirmConfig({ visible: true, title, message, onConfirm });
  const hideConfirm = () => setConfirmConfig(prev => ({ ...prev, visible: false }));

  // Check if we are in selection mode
  const { onSelect, selectedId } = route.params || {};

  useEffect(() => {
    if (user?.deliveryAddresses) {
      setLocalAddresses(user.deliveryAddresses);

      // Auto-sync active address to LocationContext so Checkout uses it
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

  // Initial fetch if needed
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
      // Optimistic update: If activating, deactivate all others. If deactivating, just deactivate self.
      const updatedLocal = localAddresses.map(addr => {
        if (addressId === addr._id) return { ...addr, isActive: !isActive }; // Toggle target
        if (!isActive) return { ...addr, isActive: false }; // If target is becoming active, force others inactive
        return addr;
      });
      setLocalAddresses(updatedLocal);

      const response = await AddressApi.toggleDeliveryAddressStatus(addressId);

      if (response.data && response.data.success) {
        // Ideally refetch or just rely on optimistic
        fetchUserProfile();

        // If turning ON, select this address as current/header address
        if (!isActive) {
          const selected = localAddresses.find(a => a._id === addressId);
          if (selected) {
            // Map to LocationContext format (needs consistency)
            selectAddress({
              ...selected,
              address: selected.street, // Mapping 'street' to 'address' for context
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
      showModal(t('error'), t('failedToUpdateStatus'));
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
      // If selecting a non-active address, make it active globally first
      // This ensures that "Selected" for checkout == "Active" in backend context
      if (!address.isActive) {
        setLoading(true);
        try {
          // Re-use logic: 'current status is false' -> toggle to true
          await AddressApi.toggleDeliveryAddressStatus(address._id);
          // Refresh local state to ensure consistency before returning
          await fetchUserProfile();

          // Update the address object to be returned with active status
          const updatedAddress = { ...address, isActive: true };
          onSelect(updatedAddress);
        } catch (err) {
          console.error('Failed to toggle active status on selection:', err);
          // Fallback: still select it locally even if backend toggle failed
          onSelect(address);
        } finally {
          setLoading(false);
          navigation.goBack();
        }
      } else {
        // Already active, just select
        onSelect(address);
        navigation.goBack();
      }
    }
  };

  const AddressCard = ({ address }) => {
    const isSelected = selectedId === address._id;

    return (
      <TouchableOpacity
        style={[
          styles(colors).addressCard,
          isSelected && styles(colors).addressCardSelected
        ]}
        onPress={() => onSelect ? handleSelect(address) : null}
        activeOpacity={onSelect ? 0.7 : 1}
      >
        <View style={styles(colors).addressHeader}>
          <View style={styles(colors).addressTypeContainer}>
            <View style={styles(colors).addressIconContainer}>
              <MaterialCommunityIcons
                name={address.addressType === 'OFFICE' ? 'briefcase' : address.addressType === 'OTHER' ? 'map-marker' : 'home'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles(colors).addressTypeInfo}>
              <Text style={styles(colors).addressType}>{address.addressType || t('home')}</Text>
              {address.isActive && (
                <View style={styles(colors).defaultBadge}>
                  <Text style={styles(colors).defaultText}>{t('active')}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Toggle Switch - Only show if NOT in selection mode */}
            {!onSelect && (
              <TouchableOpacity onPress={() => handleToggleStatus(address._id, address.isActive)} style={{ padding: 4 }}>
                <MaterialCommunityIcons
                  name={address.isActive ? "toggle-switch" : "toggle-switch-off-outline"}
                  size={36}
                  color={address.isActive ? colors.primary : colors.text.light}
                />
              </TouchableOpacity>
            )}

            {!onSelect && (
              <TouchableOpacity
                style={styles(colors).moreButton}
                onPress={() => handleDelete(address._id)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles(colors).addressText}>
          {[address.street, address.detailedAddress].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles(colors).cityText}>
          {[address.city, address.state, address.country, address.postalCode].filter(Boolean).join(', ')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles(colors).backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles(colors).headerText}>{t('savedAddresses')}</Text>
        <TouchableOpacity
          style={styles(colors).refreshButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles(colors).content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 10 }} />}

        {localAddresses.length === 0 && !loading ? (
          <View style={styles(colors).emptyState}>
            <Ionicons name="location-outline" size={64} color={colors.text.light} />
            <Text style={styles(colors).emptyStateText}>{t('noSavedAddresses')}</Text>
          </View>
        ) : (
          localAddresses.map(address => (
            <AddressCard key={address._id} address={address} />
          ))
        )}

        {/* Add New Address Button */}
        <TouchableOpacity
          style={styles(colors).addAddressButton}
          onPress={() => navigation.navigate('LocationAddress', {
            mode: 'add_delivery_address',
            onSave: () => fetchUserProfile()
          })}
        >
          <View style={styles(colors).addIconContainer}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </View>
          <Text style={styles(colors).addAddressText}>{t('addNewAddress')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideModal}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <View style={styles(colors).modalIconContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={styles(colors).modalTitle}>{modalConfig.title}</Text>
            <Text style={styles(colors).modalMessage}>{modalConfig.message}</Text>
            <TouchableOpacity
              style={[styles(colors).modalButton, { backgroundColor: colors.primary }]}
              onPress={hideModal}
            >
              <Text style={styles(colors).modalButtonText}>{t('ok')}</Text>
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
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <View style={[styles(colors).modalIconContainer, { backgroundColor: '#FFF5F5' }]}>
              <Ionicons name="trash-outline" size={48} color={colors.error} />
            </View>
            <Text style={styles(colors).modalTitle}>{confirmConfig.title}</Text>
            <Text style={styles(colors).modalMessage}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles(colors).modalButton, { backgroundColor: colors.border, flex: 1 }]}
                onPress={hideConfirm}
              >
                <Text style={[styles(colors).modalButtonText, { color: colors.text.primary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles(colors).modalButton, { backgroundColor: colors.error, flex: 1 }]}
                onPress={() => {
                  hideConfirm();
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                }}
              >
                <Text style={styles(colors).modalButtonText}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

const styles = (colors) => StyleSheet.create({
  // ... existing styles ...
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.1)',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F6' : 'rgba(220, 49, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  defaultBadge: {
    backgroundColor: colors.background === '#FFFFFF' ? '#E8F5E9' : 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.background === '#FFFFFF' ? '#A5D6A7' : 'rgba(76, 175, 80, 0.3)',
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
    fontFamily: 'Poppins-SemiBold',
  },
  moreButton: {
    padding: 4,
    marginLeft: 12,
  },
  addressText: {
    fontSize: 15,
    color: colors.text.primary,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
    lineHeight: 22,
  },
  cityText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    fontFamily: 'Poppins-Medium',
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginTop: 8,
  },
  addIconContainer: {
    marginRight: 12,
  },
  addAddressText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    fontFamily: 'Poppins-Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
});

export default SavedAddressesScreen;
