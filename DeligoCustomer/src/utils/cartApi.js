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
        // Backend now expects Bearer token
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
        console.debug('[CartAPI] auth present, mask:', maskToken(authHeader));
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

          // Construct payload with variantName if present
          const payload = {
            productId: sku || internal,
            quantity: it.quantity
          };

          if (it.variantName) {
            payload.variantName = it.variantName;
          }
          if (it.options) {
            payload.options = it.options;
          }
          if (it.addons) {
            payload.addons = it.addons;
          }

          console.debug('[CartAPI] Item payload:', payload);
          return payload;
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
   * Update item quantity (increment/decrement)
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to change
   * @param {string} action - 'increment' or 'decrement'
   * @returns {Promise}
   */
  static async activateItem(productId, quantity, action = 'increment', variantName = null) {
    try {
      // IMPORTANT: Use UPDATE_QUANTITY endpoint, not ACTIVATE_ITEM
      // ACTIVATE_ITEM is for toggling active/inactive (Boolean), not for quantity updates
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.UPDATE_QUANTITY}`;
      const headers = await this.getHeaders();

      const payload = { productId, quantity, action };

      // Include variantName if provided (required for products with variations)
      if (variantName) {
        payload.variantName = variantName;
      }

      console.debug('[CartAPI] PATCH', url, payload);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to update item';
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
   * Delete items from cart
   * @param {Array} items - Array of product IDs (strings) or objects with { productId, variantName }
   * @returns {Promise}
   */
  static async deleteItems(items) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.DELETE_ITEM}`;
      const headers = await this.getHeaders();

      // Transform input into array of objects with productId (and optional variantName)
      const payload = Array.isArray(items)
        ? items.map(item => {
          if (typeof item === 'string') {
            return { productId: item };
          } else if (item && typeof item === 'object') {
            const obj = { productId: item.productId || item.id };
            if (item.variantName) obj.variantName = item.variantName;
            if (item.options) obj.options = item.options;
            if (item.addons) {
              // Ensure mapping matches what addToCart uses (addOnId vs addonId)
              obj.addons = item.addons.map(a => ({
                addOnId: a.addOnId || a.addonId || a.id,
                quantity: a.quantity || 1
              }));
            }
            return obj;
          }
          return { productId: item };
        })
        : [typeof items === 'string' ? { productId: items } : items];

      console.debug('[CartAPI] DELETE', url, payload);

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(payload),
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
   * Update add-on quantity
   * @param {string} productId - The parent product ID
   * @param {string} variantName - The variant name (required)
   * @param {string} optionId - The add-on option ID
   * @param {string} action - 'increment' or 'decrement'
   */
  static async updateAddonQuantity(productId, variantName, optionId, action = 'increment') {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.UPDATE_ADDON_QUANTITY}`;
      const headers = await this.getHeaders();

      const payload = {
        productId,
        variantName,
        optionId,
        action
      };

      console.debug('[CartAPI] PATCH (Addon)', url, payload);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to update addon quantity';
        console.error('Cart API - Update addon error:', {
          status: response.status,
          data: responseData
        });
        return { success: false, error: errorMessage, status: response.status };
      }
      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Update addon network error:', error);
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
