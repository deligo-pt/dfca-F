/**
 * @format
 * Coupon API Service
 * Handles fetching, verifying, and applying coupons
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
            if (token && typeof token === 'object') {
                token = token.accessToken || token.token || token.value || null;
            }
            if (token) {
                const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                headers.Authorization = authHeader;
            }
        } catch (e) {
            console.debug('[CouponAPI] token read error', e);
        }
        return headers;
    }

    /**
     * Get all available coupons
     * @param {string} vendorId - Optional vendor ID to filter coupons
     */
    static async getCoupons(vendorId = null) {
        try {
            let url = `${BASE_API_URL}${API_ENDPOINTS.COUPONS.LIST}`;
            if (vendorId) {
                url += `?vendorId=${vendorId}`;
            }

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

            return { success: true, data: data.data || data };
        } catch (error) {
            console.error('[CouponAPI] getCoupons error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }

    /**
     * Apply a coupon to the cart
     * @param {string} couponId - The ID of the coupon to apply
     * @param {string} type - Application type (default: 'CART')
     */
    static async applyCoupon(couponId, type = 'CART') {
        try {
            const url = `${BASE_API_URL}${API_ENDPOINTS.COUPONS.APPLY}`;
            const headers = await this.getHeaders();
            const payload = { couponId, type };

            console.debug('[CouponAPI] POST Apply', url, payload);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                // handle 400 etc
                return { success: false, error: data?.message || data?.error || 'Failed to apply coupon', status: response.status };
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('[CouponAPI] applyCoupon error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }

    /**
     * Verify a manual coupon code (resolves to ID if valid)
     * @param {string} code - The manual code entered by user
     */
    static async verifyCode(code) {
        try {
            const url = `${BASE_API_URL}${API_ENDPOINTS.COUPONS.VERIFY}`;
            const headers = await this.getHeaders();

            console.debug('[CouponAPI] POST Verify', url, { code });

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data?.message || 'Invalid code', status: response.status };
            }

            return { success: true, data: data.data || data };
        } catch (error) {
            console.error('[CouponAPI] verifyCode error:', error);
            return { success: false, error: error?.message || 'Network error' };
        }
    }
}

export default CouponAPI;
