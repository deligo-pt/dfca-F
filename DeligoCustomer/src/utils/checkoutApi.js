/**
 * Checkout API Service
 * 
 * Manages checkout session initialization and creation.
 */

import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from './storage';

const maskToken = (t) => {
  try {
    if (!t) return null;
    const s = t.toString();
    if (s.length <= 12) return `${s.slice(0, 4)}...`;
    return `${s.slice(0, 8)}...${s.slice(-4)}`;
  } catch (e) { return null; }
};

class CheckoutAPI {
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
        console.debug('[CheckoutAPI] auth present, mask:', maskToken(authHeader));
      }
    } catch (e) {
      console.debug('[CheckoutAPI] token read error', e);
    }

    return headers;
  }

  /**
   * Create checkout
   * @param {object} payload - The full payload body for checkout creation. 
   *                           Can be { useCart: true, ... } or { items: [...], ... }
   * @returns {Promise}
   */
  static async createCheckout(payload = {}) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.CHECKOUT.CREATE}`;
      const headers = await this.getHeaders();

      console.debug('[CheckoutAPI] POST', url, payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseData = await response.json();

      console.debug('[CheckoutAPI] createCheckout response status:', response.status, 'data:', responseData);

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to create checkout';
        console.error('Checkout API - Create checkout error:', {
          status: response.status,
          data: responseData
        });

        if (response.status === 401) {
          return { success: false, error: responseData || { message: 'Unauthorized' }, status: 401 };
        }

        return { success: false, error: errorMessage, status: response.status, data: responseData };
      }

      return { success: true, data: responseData, status: response.status };
    } catch (error) {
      console.error('Checkout API - Create checkout network error:', error);
      return { success: false, error: error?.message || 'Network error occurred', status: null };
    }
  }

  /**
   * Validate and apply offer to a checkout session
   * @param {object} payload - { checkoutId, offerIdentifier }
   * @returns {Promise}
   */
  static async validateApplyOffer(payload) {
    try {
      const url = `${BASE_API_URL}/offers/validate-apply-offer`;
      const headers = await this.getHeaders();

      console.debug('[CheckoutAPI] POST validate-apply-offer', url, payload);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { success: false, error: responseData?.message || 'Failed to apply offer', data: responseData };
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Checkout API - Validate offer error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }
}

export default CheckoutAPI;

