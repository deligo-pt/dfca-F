import { customerApi } from './api';

/**
 * Address API Utilities
 * 
 * Provides methods for managing customer delivery addresses.
 */
const AddressApi = {
  /**
   * Add a new delivery address
   * @param {Object} payload - The address payload
   * @returns {Promise<Object>} Response data
   */
  addDeliveryAddress: async (payload) => {
    try {
      const response = await customerApi.post('/customers/add-delivery-address', payload);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an existing delivery address by ID
   * Endpoint: PATCH customers/update-delivery-address/:addressId
   * @param {string} addressId - The ID of the address to update
   * @param {Object} payload - Must follow: { deliveryAddress: { street, city, state, country, postalCode, longitude, latitude, geoAccuracy, detailedAddress, zoneId, notes, addressType } }
   * @returns {Promise<Object>} Response data
   */
  updateDeliveryAddress: async (addressId, payload) => {
    try {
      const response = await customerApi.patch(`/customers/update-delivery-address/${addressId}`, payload);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a delivery address by ID
   * @param {string} addressId - The ID of the address to delete
   * @returns {Promise<Object>} Response data
   */
  deleteDeliveryAddress: async (addressId) => {
    try {
      const response = await customerApi.delete(`/customers/delete-delivery-address/${addressId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Toggle the active status of a delivery address
   * @param {string} addressId - The ID of the address to toggle
   * @returns {Promise<Object>} Response data
   */
  toggleDeliveryAddressStatus: async (addressId) => {
    try {
      const response = await customerApi.patch(`/customers/toggle-delivery-address-status/${addressId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default AddressApi;
