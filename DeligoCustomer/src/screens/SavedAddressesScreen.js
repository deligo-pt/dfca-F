import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { customerApi } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';

const SavedAddressesScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user, fetchUserProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAddresses, setLocalAddresses] = useState([]);

  // Check if we are in selection mode
  const { onSelect, selectedId } = route.params || {};

  useEffect(() => {
    if (user?.deliveryAddresses) {
      setLocalAddresses(user.deliveryAddresses);
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
      // Optimistic update
      const updatedLocal = localAddresses.map(addr =>
        addr._id === addressId ? { ...addr, isActive: !isActive } : addr
      );
      setLocalAddresses(updatedLocal);

      const response = await customerApi.patch(`/customers/toggle-delivery-address-status/${addressId}`);

      if (response.data && response.data.success) {
        // Ideally refetch or just rely on optimistic
        fetchUserProfile();
      } else {
        // Revert if failed
        Alert.alert(t('error'), t('failedToUpdateStatus'));
        setLocalAddresses(user.deliveryAddresses || []);
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      Alert.alert(t('error'), t('failedToUpdateStatus'));
      setLocalAddresses(user.deliveryAddresses || []);
    }
  };

  const handleDelete = (addressId) => {
    Alert.alert(
      t('deleteAddress'),
      t('areYouSureDeleteAddress'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await customerApi.delete(`/customers/delete-delivery-address/${addressId}`);
              await fetchUserProfile();
            } catch (error) {
              console.error('Delete address error:', error);
              const errMsg = error?.response?.data?.message || error?.message || t('failedToDeleteAddress');
              Alert.alert(t('error'), errMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSelect = (address) => {
    if (onSelect) {
      onSelect(address);
      navigation.goBack();
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
            {/* Toggle Switch Placeholder - using opacity for now or simple touch */}
            <TouchableOpacity onPress={() => handleToggleStatus(address._id, address.isActive)} style={{ padding: 4 }}>
              <MaterialCommunityIcons
                name={address.isActive ? "toggle-switch" : "toggle-switch-off-outline"}
                size={36}
                color={address.isActive ? colors.primary : colors.text.light}
              />
            </TouchableOpacity>

            {!onSelect && (
              (address.addressType !== 'PRIMARY' && address.addressType !== 'HOME') ? (
                <TouchableOpacity
                  style={styles(colors).moreButton}
                  onPress={() => handleDelete(address._id)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              ) : null
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
