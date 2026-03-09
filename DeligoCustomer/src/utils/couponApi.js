/**
 * Coupon API Service
 * 
 * Handles retrieval, validation, and application of coupons and offers.
 */

import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from './storage';

class CouponAPI {
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
            console.debug('[CouponAPI] Raw token from storage:', token ? (typeof token === 'object' ? JSON.stringify(token) : 'string ' + token.substr(0, 10)) : 'null');

            if (token && typeof token === 'object') {
                token = token.accessToken || token.token || token.value || null;
            }
            if (token) {
                const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                headers.Authorization = authHeader;
                console.debug('[CouponAPI] Authorization header set:', authHeader.substring(0, 15) + '...');
            } else {
                console.warn('[CouponAPI] No token found for Authorization header');
            }
        } catch (e) {
            console.debug('[CouponAPI] token read error', e);
        }
        return headers;
    }

    /**
     * Get all available coupons/offers
     * @param {string} vendorId - Optional vendor ID to filter coupons
     */
    static async getCoupons(vendorId = null) {
        try {
            // Fetch offers configuration (fallback to coupons list)
            let url = `${BASE_API_URL}${API_ENDPOINTS.OFFERS?.LIST || API_ENDPOINTS.COUPONS.LIST}`;

            const headers = await this.getHeaders();
            console.debug('[CouponAPI] GET', url);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data?.message || 'Failed to fetch coupons', status: response.status };
            }

            // The API returns { data: { data: [...] } } based on user snippet
            // Handle both structures mainly
            const items = data.data?.data || data.data || [];

            // Filter items by vendor if required (client-side fallback)
            const filtered = vendorId
                ? items.filter(i => !i.vendorId || i.vendorId === vendorId)
                : items;

            return { success: true, data: filtered };
        } catch (error) {
            console.error('[CouponAPI] getCoupons error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }

    /**
     * Get available offers for a specific checkout
     * @param {string} checkoutId - The checkout ID
     */
    static async getAvailableCheckoutOffers(checkoutId) {
        try {
            const url = `${BASE_API_URL}/offers/available-offers/${checkoutId}`;
            const headers = await this.getHeaders();
            console.debug('[CouponAPI] GET', url);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data?.message || 'Failed to fetch checkout offers', status: response.status };
            }

            const items = data.data?.data || data.data || [];

            return { success: true, data: items };
        } catch (error) {
            console.error('[CouponAPI] getAvailableCheckoutOffers error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }

    /**
     * Apply a coupon to the cart
     * @param {string} identifier - The ID or Code of the coupon/offer
     * @param {string} type - Application type (default: 'CART')
     * @param {boolean} isCode - Whether the identifier is a manual code (vs ID)
     */
    static async applyCoupon(identifier, type = 'CART', isCode = false) {
        try {
            const url = `${BASE_API_URL}${API_ENDPOINTS.COUPONS.APPLY}`;
            const headers = await this.getHeaders();

            const payload = { type };
            if (isCode) {
                payload.code = identifier;
            } else {
                payload.couponId = identifier;
            }

            console.debug('[CouponAPI] POST Apply', url, payload);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data?.message || data?.error || 'Failed to apply coupon', status: response.status };
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('[CouponAPI] applyCoupon error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }

    /**
     * Check if an offer is applicable (Validation)
     * Recommended method for manual code checking before applying
     */
    static async getApplicableOffer(vendorId, subTotal, offerCode) {
        try {
            const url = `${BASE_API_URL}${API_ENDPOINTS.OFFERS?.GET_APPLICABLE}`;
            if (!url || url.includes('undefined')) {
                // Feature not available in configuration
                return { success: false, error: 'Feature not configured' };
            }

            const headers = await this.getHeaders();
            const payload = { vendorId, subTotal, offerCode };

            console.debug('[CouponAPI] PATCH CheckAvailable', url, payload);

            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data?.message || 'Offer not applicable', status: response.status };
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('[CouponAPI] getApplicableOffer error:', error);
            return { success: false, error: error.message };
        }
    }
}

export default CouponAPI;
