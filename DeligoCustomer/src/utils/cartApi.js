/**
 * @format
 * Cart API Service
 * Centralized API calls for cart operations
 * Uses direct fetch calls similar to ProductsContext pattern
 */

import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from './storage';
import { isValidObjectId } from './objectId';

const maskToken = (t) => {
  try {
    if (!t) return null;
    const s = t.toString();
    if (s.length <= 12) return `${s.slice(0, 4)}...`;
    return `${s.slice(0, 8)}...${s.slice(-4)}`;
  } catch (e) { return null; }
};

class CartAPI {
  /**
   * Helper to get authorization headers
   */
  static async getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      let token = await StorageService.getAccessToken();
      // Handle tokens stored as objects { accessToken } or { token }
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value || null;
      }

      if (token) {
        // Backend expects raw token without Bearer prefix based on api.js pattern
        const rawToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        headers.Authorization = rawToken;
        console.debug('[CartAPI] auth present, mask:', maskToken(rawToken));
      }
    } catch (e) {
      console.debug('[CartAPI] token read error', e);
    }

    return headers;
  }

  /**
   * Add items to cart
   * @param {Array} items - Array of items with productId and quantity
   * @returns {Promise}
   */
  static async addToCart(items) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.ADD_TO_CART}`;
      const headers = await this.getHeaders();
      const rawItems = Array.isArray(items) ? items : [];
      const preparedItems = rawItems
        .filter(it => typeof it?.productId === 'string' && it.productId.trim())
        .map(it => {
          const sku = it.productId.trim();
          const internal = typeof it.internalId === 'string' && /^[0-9a-fA-F]{24}$/.test(it.internalId) ? it.internalId : null;

          // IMPORTANT: User requested to prioritize Mongo ID. 
          // The previous logic forced SKU. Now we trust the passed ID (sku variable matches productId) 
          // but we still check for regex to be safe if that's what was passed.

          if (/^PROD-/i.test(sku)) {
            // SKU format passed
            console.debug('[CartAPI] Using SKU format:', sku);
            return { productId: sku, quantity: it.quantity };
          } else if (isValidObjectId(sku)) {
            // Mongo ID passed
            console.debug('[CartAPI] Using Mongo ID:', sku);
            return { productId: sku, quantity: it.quantity };
          } else if (internal) {
            // Internal ID fallback
            console.debug('[CartAPI] Using internal ID:', internal);
            return { productId: internal, quantity: it.quantity };
          } else {
            // Fallback
            console.debug('[CartAPI] Using fallback ID:', sku);
            return { productId: sku, quantity: it.quantity };
          }
        });
      if (!preparedItems.length) {
        console.error('[CartAPI][cart:id-debug] no usable productIds in payload');
        return { success: false, error: 'No productId provided', status: 422 };
      }
      console.debug('[CartAPI] POST', url, 'items:', preparedItems);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: preparedItems }),
      });
      const responseData = await response.json();
      console.debug('[CartAPI] addToCart response status:', response.status, 'data:', responseData);
      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to add items to cart';
        console.error('Cart API - Add to cart error:', { status: response.status, data: responseData });
        if (response.status === 401) {
          return { success: false, error: responseData || { message: 'Unauthorized' }, status: 401 };
        }
        return { success: false, error: errorMessage, status: response.status };
      }
      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Add to cart network error:', error);
      return { success: false, error: error?.message || 'Network error occurred', status: null };
    }
  }

  /**
   * Activate or deactivate item (increment/decrement quantity)
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to change
   * @param {string} action - 'increment' or 'decrement'
   * @returns {Promise}
   */
  static async activateItem(productId, quantity, action = 'increment') {
    try {
      const endpoint = API_ENDPOINTS.CART.ACTIVATE_ITEM.replace(':productId', productId);
      const url = `${BASE_API_URL}${endpoint}`;
      const headers = await this.getHeaders();

      console.debug('[CartAPI] PATCH', url, { productId, quantity, action });

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ productId, quantity, action }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to update item';
        console.error('Cart API - Activate item error:', {
          status: response.status,
          data: responseData
        });
        return { success: false, error: errorMessage, status: response.status };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Activate item network error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Delete items from cart
   * @param {Array} productIds - Array of product IDs to delete
   * @returns {Promise}
   */
  static async deleteItems(productIds) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.DELETE_ITEM}`;
      const headers = await this.getHeaders();

      console.debug('[CartAPI] DELETE', url, { productId: productIds });

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ productId: productIds }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to delete items';
        console.error('Cart API - Delete items error:', {
          status: response.status,
          data: responseData
        });
        return { success: false, error: errorMessage, status: response.status };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Delete items network error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Update item quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise}
   */
  static async updateQuantity(productId, quantity) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.UPDATE_QUANTITY}`;
      const headers = await this.getHeaders();

      console.debug('[CartAPI] PATCH', url, { productId, quantity });

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ productId, quantity }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to update quantity';
        console.error('Cart API - Update quantity error:', {
          status: response.status,
          data: responseData
        });
        return { success: false, error: errorMessage, status: response.status };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Update quantity network error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Get cart contents
   * @returns {Promise}
   */
  static async getCart() {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.GET}`;
      const headers = await this.getHeaders();

      console.debug('[CartAPI] GET', url);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to fetch cart';
        console.error('Cart API - Get cart error:', {
          status: response.status,
          data: responseData
        });
        return { success: false, error: errorMessage, status: response.status };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Get cart network error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Note: Clear entire cart endpoint doesn't exist on backend (returns 404)
   * Use deleteItems() to remove individual items or multiple items at once
   */
}

export default CartAPI;
