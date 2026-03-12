/**
 * Cart API Service
 * 
 * Centralized management of shopping cart operations including addition,
 * modification, and removal of items. Abstracts payload construction and
 * error handling.
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
        // Attach Bearer token
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
    let timeoutId = null;
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.ADD_TO_CART}`;
      const headers = await this.getHeaders();
      const rawItems = Array.isArray(items) ? items : [];
      const preparedItems = rawItems
        .filter(it => typeof it?.productId === 'string' && it.productId.trim())
        .map(it => {
          const sku = it.productId.trim();
          const internal = typeof it.internalId === 'string' && /^[0-9a-fA-F]{24}$/.test(it.internalId) ? it.internalId : null;

          // Prioritize internal ID for strict validation
          // Falls back to SKU/ProductId if Internal ID is missing or invalid

          // Construct payload with variantName if present
          const payload = {
            productId: sku || internal,
            quantity: it.quantity
          };

          if (it.variantName) {
            payload.variantName = it.variantName;
          }
          // CRITICAL: Include variationSku if present (required for some backends)
          if (it.variationSku) {
            payload.variationSku = it.variationSku;
          }

          if (it.options && Object.keys(it.options).length > 0) {
            payload.options = it.options;
          }
          if (it.addons) {
            // Ensure addons match backend expectation (Postman example uses addOnId)
            payload.addons = Array.isArray(it.addons) 
              ? it.addons.map(addon => {
                  const addOnId = addon.addOnId || addon.addonId || addon.optionId || addon.id;
                  return {
                    addOnId: addOnId,
                    quantity: addon.quantity || 1
                  };
                })
              : it.addons;
          }

          console.debug('[CartAPI] Item payload:', payload);
          return payload;
        });
      if (!preparedItems.length) {
        console.error('[CartAPI][cart:id-debug] no usable productIds in payload');
        return { success: false, error: 'No productId provided', status: 422 };
      }

      console.debug('[CartAPI] POST', url, 'items:', preparedItems);
      const controller = new AbortController();
      // Add-to-cart can include heavy backend calculations; keep timeout more tolerant.
      timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: preparedItems }),
        signal: controller.signal
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (error?.name === 'AbortError') {
        console.warn('Cart API - Add to cart timeout:', error);
        return {
          success: false,
          error: 'Request timed out while adding to cart. Please try again.',
          status: 408,
        };
      }

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
  static async activateItem(productId, quantity, action = 'increment', variantName = null, variationSku = null) {
    try {
      // Update item quantity via dedicated endpoint
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.UPDATE_QUANTITY}`;
      const headers = await this.getHeaders();

      const payload = { productId, quantity, action };

      // Include variantName if provided (required for products with variations)
      if (variantName) {
        payload.variantName = variantName;
      }

      // Include variationSku if provided (CRITICAL for products with variations)
      if (variationSku) {
        payload.variationSku = variationSku;
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
            // CRITICAL: Include variationSku to ensure correct item deletion
            if (item.variationSku) {
              obj.variationSku = item.variationSku;
            }
            if (item.variantName) obj.variantName = item.variantName;
            if (item.options) obj.options = item.options;
            if (item.addons) {
              // Normalize addon structure
              obj.addons = item.addons.map(a => ({
                addOnId: a.addOnId || a.addonId || a.id || a.optionId,
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

        if (response.status === 404) {
          console.debug('Cart API - Delete items 404 (already empty):', { status: response.status });
        } else {
          console.error('Cart API - Delete items error:', {
            status: response.status,
            data: responseData
          });
        }

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
  static async updateAddonQuantity(productId, variantName, optionId, action = 'increment', variationSku = null, addonSku = null) {
    console.log('[CartAPI] updateAddonQuantity called with:', { productId, variantName, optionId, action, variationSku, addonSku });
    try {
      // CRITICAL: Backend validation requires EXACTLY productId, variationSku, optionId, action
      // Ensure productId is a valid hex string if it's a mongo ID
      const cleanProductId = typeof productId === 'string' ? productId.split('|')[0] : productId;
      
      const url = `${BASE_API_URL}${API_ENDPOINTS.CART.UPDATE_ADDON_QUANTITY}`;
      const headers = await this.getHeaders();

      const payload = {
        productId: cleanProductId,
        optionId,
        action,
      };

      // Only include variationSku if it's actually provided and not empty
      if (variationSku) {
        payload.variationSku = variationSku;
      }

      console.debug('[CartAPI] PATCH (Addon)', url, payload);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        let errorMessage = responseData?.message || responseData?.error || 'Failed to update addon quantity';

        // Extract deep validation errors if they exist (e.g. array of objects)
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          errorMessage = responseData.errors.map(e => typeof e === 'object' ? (e.msg || e.message || JSON.stringify(e)) : e).join('\\n');
        } else if (responseData?.errors && typeof responseData.errors === 'string') {
          errorMessage = responseData.errors;
        }

        console.error('\\n[CartAPI] RAW ADDON VALIDATION RESPONSE:', JSON.stringify(responseData, null, 2));

        if (response.status < 500) {
          console.warn('Cart API - Update addon warning:', {
            status: response.status,
            data: responseData
          });
        } else {
          console.error('Cart API - Update addon error:', {
            status: response.status,
            data: responseData
          });
        }
        return { success: false, error: errorMessage, status: response.status, rawResponse: responseData };
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
        if (response.status === 404) {
          console.debug('Cart API - Get cart empty (404):', errorMessage);
        } else {
          console.error('Cart API - Get cart error:', {
            status: response.status,
            data: responseData
          });
        }
        return { success: false, error: errorMessage, status: response.status };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Cart API - Get cart network error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Note: Full cart clear is performed via batch item deletion
   */
}

export default CartAPI;
