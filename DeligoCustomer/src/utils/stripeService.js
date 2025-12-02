// Central Stripe helper
// NOTE: Requires server endpoints to create PaymentIntent and ephemeral key.

import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import StorageService from './storage';
import { BASE_API_URL } from '../constants/config';

// Store the payment intent client secret for later use
let currentPaymentIntentClientSecret = null;

async function getAuthHeader() {
  try {
    let token = await StorageService.getAccessToken();
    if (token && typeof token === 'object') token = token.accessToken || token.token || token.value;
    if (!token) return {};
    const raw = token.startsWith('Bearer ') ? token.substring(7) : token;
    return { Authorization: raw };
  } catch (e) {
    return {};
  }
}

/**
 * Extract payment intent ID from client secret
 * Format: pi_xxxxxxxxxxxxx_secret_yyyyyyyyyyy
 * Returns: pi_xxxxxxxxxxxxx
 */
export function extractPaymentIntentId(clientSecret) {
  if (!clientSecret) return null;
  try {
    // Split by '_secret_' and take the first part
    const parts = clientSecret.split('_secret_');
    if (parts.length > 0 && parts[0].startsWith('pi_')) {
      return parts[0];
    }
    return null;
  } catch (e) {
    console.warn('[stripeService] Failed to extract payment intent ID:', e);
    return null;
  }
}

/**
 * Get the current payment intent ID
 */
export function getCurrentPaymentIntentId() {
  return extractPaymentIntentId(currentPaymentIntentClientSecret);
}

export async function fetchPaymentSheetParams(checkoutSummaryId) {
  const url = `${BASE_API_URL}/payment/stripe/create-payment-intent`;
  if (!checkoutSummaryId) return { success: false, error: 'Missing checkoutSummaryId' };
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...(await getAuthHeader()) };
    console.debug('[stripeService] POST', url, { checkoutSummaryId });
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ checkoutSummaryId }) });
    let data = null;
    try { data = await res.json(); } catch (parseErr) {
      console.warn('[stripeService] response JSON parse failed', parseErr);
      data = { raw: null };
    }
    console.debug('[stripeService] create-payment-intent response:', { status: res.status, data });
    if (!res.ok) {
      // Specific error handling for common issues
      let errorMessage = data?.message || 'Failed to create payment intent';

      if (data?.error?.type === 'StripeConnectionError' || errorMessage.includes('connection to Stripe')) {
        console.error('[stripeService] ⚠️ Backend Stripe Connection Error - Check backend .env STRIPE_SECRET_KEY');
        errorMessage = 'Backend cannot connect to Stripe API. Please check server configuration.';
      } else if (res.status === 500) {
        console.error('[stripeService] Backend server error:', data);
      } else if (res.status === 401 || res.status === 403) {
        errorMessage = 'Authentication failed. Please login again.';
      }

      return { success: false, error: errorMessage, status: res.status, data };
    }
    // Flexible field extraction
    const paymentIntent = data?.data?.paymentIntent || data?.paymentIntent || data?.data?.clientSecret || data?.clientSecret;
    const ephemeralKey = data?.data?.ephemeralKey || data?.ephemeralKey;
    const customer = data?.data?.customer || data?.customer || data?.data?.customerId || data?.customerId;
    if (!paymentIntent) return { success: false, error: 'Payment intent not found in response', data };

    // Store the client secret for later extraction of payment intent ID
    currentPaymentIntentClientSecret = paymentIntent;
    console.debug('[stripeService] Stored payment intent, ID:', extractPaymentIntentId(paymentIntent));

    return { success: true, paymentIntent, ephemeralKey, customer };
  } catch (e) {
    return { success: false, error: e?.message || 'Network error' };
  }
}

export async function setupPaymentSheet(checkoutSummaryId) {
  const paramsRes = await fetchPaymentSheetParams(checkoutSummaryId);
  if (!paramsRes.success) return paramsRes;
  const { paymentIntent, ephemeralKey, customer } = paramsRes;
  const initConfig = { paymentIntentClientSecret: paymentIntent, allowsDelayedPaymentMethods: true, merchantDisplayName: 'Deligo' };
  if (customer) initConfig.customerId = customer;
  if (ephemeralKey) initConfig.customerEphemeralKeySecret = ephemeralKey;
  console.debug('[stripeService] Initializing payment sheet with config:', { hasPaymentIntent: !!paymentIntent, hasCustomer: !!customer, hasEphemeralKey: !!ephemeralKey });
  const initRes = await initPaymentSheet(initConfig);
  if (initRes.error) return { success: false, error: initRes.error.message || 'Stripe init failed' };
  return { success: true };
}

export async function openPaymentSheet() {
  const res = await presentPaymentSheet();
  if (res.error) return { success: false, error: res.error.message || 'Payment failed' };

  // Extract and return the payment intent ID
  const paymentIntentId = getCurrentPaymentIntentId();
  console.debug('[stripeService] Payment successful, paymentIntentId:', paymentIntentId);

  return { success: true, paymentIntentId };
}
