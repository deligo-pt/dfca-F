/**
 * @format
 * Order API Service
 * Handles order creation and management
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

class OrderAPI {
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
        console.debug('[OrderAPI] auth present, mask:', maskToken(authHeader));
      }
    } catch (e) {
      console.debug('[OrderAPI] token read error', e);
    }

    return headers;
  }

  /**
   * Create order after successful payment
   * @param {string} checkoutSummaryId - Checkout summary ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise}
   */
  static async createOrder(checkoutSummaryId, paymentIntentId) {
    try {
      const url = `${BASE_API_URL}${API_ENDPOINTS.ORDERS.CREATE_ORDER}`;
      const headers = await this.getHeaders();

      const body = {
        checkoutSummaryId,
        paymentIntentId,
      };

      console.debug('[OrderAPI] POST', url, body);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      console.debug('[OrderAPI] createOrder response status:', response.status, 'data:', responseData);

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to create order';
        console.error('Order API - Create order error:', {
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
      console.error('Order API - Create order network error:', error);
      return { success: false, error: error?.message || 'Network error occurred', status: null };
    }
  }
}

export default OrderAPI;

