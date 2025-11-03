import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

const SavedAddressesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      type: 'Home',
      icon: 'home',
      address: '123 Main Street, Apartment 4B',
      city: 'Mumbai, Maharashtra 400001',
      isDefault: true,
    },
    {
      id: 2,
      type: 'Work',
      icon: 'briefcase',
      address: 'Tech Park, Building A, Floor 5',
      city: 'Mumbai, Maharashtra 400051',
      isDefault: false,
    },
  ]);

  const AddressCard = ({ address }) => (
    <View style={styles(colors).addressCard}>
      <View style={styles(colors).addressHeader}>
        <View style={styles(colors).addressTypeContainer}>
          <View style={styles(colors).addressIconContainer}>
            <Ionicons name={address.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles(colors).addressTypeInfo}>
            <Text style={styles(colors).addressType}>{address.type}</Text>
            {address.isDefault && (
              <View style={styles(colors).defaultBadge}>
                <Text style={styles(colors).defaultText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles(colors).moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles(colors).addressText}>{address.address}</Text>
      <Text style={styles(colors).cityText}>{address.city}</Text>

      <View style={styles(colors).addressActions}>
        <TouchableOpacity style={styles(colors).actionButton}>
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles(colors).actionButton}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles(colors).actionButtonText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container} edges={['top']}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles(colors).backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles(colors).headerText}>Saved Addresses</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles(colors).content} showsVerticalScrollIndicator={false}>
        {addresses.map(address => (
          <AddressCard key={address.id} address={address} />
        ))}

        {/* Add New Address Button */}
        <TouchableOpacity style={styles(colors).addAddressButton}>
          <View style={styles(colors).addIconContainer}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </View>
          <Text style={styles(colors).addAddressText}>Add New Address</Text>
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
});

export default SavedAddressesScreen;

