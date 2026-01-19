/**
 * Robust API client with refresh-token handling and queued retries for concurrent 401s.
 * - Attaches access token from StorageService
 * - On 401: attempts refresh (body -> cookie), persists new access token, retries original
 * - Queues requests arriving during refresh to avoid multiple refresh calls
 */

import axios from 'axios';
import { getAccessToken } from './token';
import Config from '../constants/config';
import StorageService from './storage';

const { BASE_API_URL, API_CONFIG, HTTP_STATUS, API_ENDPOINTS } = Config;

const customerApi = axios.create({
  baseURL: BASE_API_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

const maskToken = (t) => {
  try {
    if (!t) return null;
    const s = t.toString();
    if (s.length <= 12) return `${s.slice(0, 4)}...`;
    return `${s.slice(0, 8)}...${s.slice(-4)}`;
  } catch (e) { return null; }
};

customerApi.interceptors.request.use(
  async config => {
    try {
      const token = await getAccessToken();
      if (token) {
        // Backend now expects Bearer token
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        config.headers.Authorization = authHeader;
        console.debug('[api] request -> auth present, mask:', maskToken(authHeader));
      }
    } catch (e) {
      console.debug('[api] request -> token read error', e);
    }
    return config;
  },
  error => Promise.reject(error),
);

customerApi.interceptors.response.use(
  res => res.data,
  async err => {
    const error = err;
    const originalRequest = error.config || {};

    if (!error.response) return Promise.reject(error);
    const status = error.response.status;

    console.warn('[api] response error', { status, url: originalRequest.url, data: error.response.data });

    if (status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers = originalRequest.headers || {};
          // Backend now expects Bearer token
          const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          originalRequest.headers.Authorization = authHeader;
          console.debug('[api] retry queued request with token mask:', maskToken(authHeader));
          return customerApi(originalRequest);
        } catch (e) {
          console.warn('[api] queued request failed after refresh', e);
          import('./auth').then(m => m.default && m.default.logout());
          return Promise.reject(e);
        }
      }

      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshUrl = `${BASE_API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
          const refreshToken = await StorageService.getRefreshToken();
          console.debug('[api] attempting refresh, refresh mask:', maskToken(refreshToken));

          // Attempt body-based refresh first
          let resp = null;
          try {
            resp = await axios.post(refreshUrl, { refreshToken }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
          } catch (e) {
            console.debug('[api] body refresh failed or returned non-200', e?.response?.status || e.message);
          }

          // If no token, try cookie-only refresh (some backends use httpOnly cookie)
          let newAccessToken = resp?.data?.data?.accessToken || resp?.data?.accessToken || resp?.data?.token || resp?.data?.access_token || null;
          if (!newAccessToken) {
            try {
              console.debug('[api] trying cookie-only refresh');
              const resp2 = await axios.post(refreshUrl, null, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
              newAccessToken = resp2?.data?.data?.accessToken || resp2?.data?.accessToken || resp2?.data?.token || resp2?.data?.access_token || null;
              resp = resp2 || resp;
            } catch (e) {
              console.debug('[api] cookie-only refresh failed', e?.response?.status || e.message);
            }
          }

          const finalToken = newAccessToken || null;
          console.debug('[api] refresh result status:', resp?.status, 'tokenPresent?', !!finalToken);

          if (!finalToken) {
            throw new Error('Refresh failed - no access token returned');
          }

          try { await StorageService.setAccessToken(finalToken); } catch (e) { console.warn('[api] persist token failed', e); }

          // Check for refresh token rotation
          const newRefreshToken = resp?.data?.data?.refreshToken || resp?.data?.refreshToken || null;
          if (newRefreshToken) {
            try { await StorageService.setRefreshToken(newRefreshToken); } catch (e) { console.warn('[api] persist new refresh token failed', e); }
          }

          processQueue(null, finalToken);

          originalRequest.headers = originalRequest.headers || {};
          // Backend now expects Bearer token
          const authHeader = finalToken.startsWith('Bearer ') ? finalToken : `Bearer ${finalToken}`;

          // Handle Axios 1.x headers class
          if (originalRequest.headers.set && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', authHeader);
          } else {
            originalRequest.headers.Authorization = authHeader;
            originalRequest.headers['Authorization'] = authHeader;
          }

          console.debug('[api] retry original with new token mask:', maskToken(authHeader));
          return customerApi(originalRequest);
        } catch (refreshError) {
          console.warn('[api] refresh failed', refreshError);
          processQueue(refreshError, null);
          import('./auth').then(m => m.default && m.default.logout());
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    }

    return Promise.reject(error);
  },
);

export { customerApi };
