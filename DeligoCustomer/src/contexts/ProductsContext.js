import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../utils/storage';
import StorageService from '../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import formatCurrency from '../utils/currency';

const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PRODUCTS.GET_ALL}`;
// Cache TTL in milliseconds (default 5 minutes)
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const ProductsContext = createContext(null);

export const useProducts = () => useContext(ProductsContext);

function normalizeProduct(p) {
  const vendor = p.vendor || {};
  return {
    _raw: p,
    id: p._id || p.productId || vendor.vendorId || `${Math.random().toString(36).slice(2)}`,
    image: vendor.storePhoto || (Array.isArray(p.images) && p.images[0]) || null,
    name: vendor.vendorName || p.name || 'Unknown',
    categories: Array.isArray(p.tags) ? p.tags : (p.category ? [p.category] : []),
    rating: (p.rating && (typeof p.rating === 'number' ? p.rating : p.rating.average)) || vendor.rating || 0,
    deliveryTime: p.deliveryTime || '',
    distance: p.distance || '',
    deliveryFee: (p.pricing && typeof p.pricing.price !== 'undefined') ? formatCurrency(p.pricing.currency || '', p.pricing.price) : '',
    offer: (p.pricing && p.pricing.discount) ? `${p.pricing.discount}% OFF` : null,
  };
}

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 20 });

  const fetchProducts = useCallback(async (overrides = {}) => {
    // Do not set loading immediately to avoid UI flicker when we can serve cached data.
    setError(null);

    // Get current params and merge with overrides - do this synchronously
    let final = { ...params, ...overrides };
    setParams(final);

    try {
      let token = await getAccessToken();
      // handle tokens stored as objects { accessToken } or { token }
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value || null;
      }
      // Redacted debug: show only prefix to avoid leaking full token
      try {
        console.debug('[ProductsContext] stored access token:', token ? `${String(token).slice(0,8)}...` : null);
      } catch (e) {}
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const qs = new URLSearchParams();
      if (final.search) qs.set('search', final.search);
      if (final.category) qs.set('category', final.category);
      if (final.vendorType) qs.set('vendorType', final.vendorType);
      if (final.tags) qs.set('tags', Array.isArray(final.tags) ? final.tags.join(',') : final.tags);
      if (final.lat) qs.set('lat', final.lat);
      if (final.lng) qs.set('lng', final.lng);
      qs.set('page', final.page || 1);
      qs.set('limit', final.limit || 20);

      const url = `${API_URL}?${qs.toString()}`;
      const cacheKey = `productsCache:${qs.toString()}`;
      // Try to read cached full response for this exact query string
      let cachedRaw = null;
      try {
        cachedRaw = await StorageService.getItem(cacheKey);
        if (cachedRaw && Array.isArray(cachedRaw.items) && cachedRaw.items.length > 0) {
          // Use cached data immediately so UI feels static
          setProducts((cachedRaw.items || []).map(normalizeProduct));
          // Optionally expose last-updated via debug logs
          try {
            const age = cachedRaw.ts ? (Date.now() - cachedRaw.ts) : null;
            console.debug('[ProductsContext] served cached products, age (ms):', age);
            if (cachedRaw.ts) setLastUpdated(cachedRaw.ts);
          } catch (e) {}
        }
      } catch (e) {
        // ignore cache read failure
        cachedRaw = null;
      }
      // Determine effective TTL (allow user override stored in storage)
      let effectiveTTL = PRODUCTS_CACHE_TTL_MS;
      try {
        const storedTtl = await StorageService.getItem('PRODUCTS_CACHE_TTL_MS');
        if (typeof storedTtl === 'number' && !isNaN(storedTtl) && storedTtl > 0) {
          effectiveTTL = storedTtl;
        }
      } catch (e) {
        console.debug('[ProductsContext] failed to read stored TTL', e);
      }

      // If cached exists and is fresh (within effectiveTTL) and caller did not force, skip network to save requests
      const cacheAge = cachedRaw && cachedRaw.ts ? (Date.now() - cachedRaw.ts) : Infinity;
      const hadCache = cachedRaw && Array.isArray(cachedRaw.items) && cachedRaw.items.length > 0;
      if (!final.force && hadCache && cacheAge < effectiveTTL) {
        // Cache is fresh enough, avoid network call
        // params already updated at start of function
        // no network request performed, so keep loading=false to avoid flicker
        return;
      }
      // helper to perform the GET
      // If we have cached data, perform network fetch in background (don't set loading)
      // If we don't have cached data, set loading to true to show spinner while fetching
      if (!hadCache) setLoading(true);
      const doGet = async (u, h) => fetch(u, { method: 'GET', headers: h });

      console.debug('[ProductsContext] GET', url, 'headers.Authorization present?', !!headers.Authorization);
      let res = await doGet(url, headers);
      // log response body redacted for debugging
      try {
        const bodyText = await res.clone().text();
        console.debug('[ProductsContext] GET status', res.status, 'body:', bodyText ? (bodyText.length > 200 ? bodyText.slice(0,200) + '...' : bodyText) : '<empty>');
      } catch (e) {
        console.debug('[ProductsContext] GET status', res.status, '(no body)');
      }
       // If unauthorized, attempt refresh once
       if (res.status === 401) {
         // try to refresh token
        let refreshToken = await getRefreshToken();
        try {
          console.debug('[ProductsContext] stored refresh token present?', !!refreshToken);
          if (refreshToken && typeof refreshToken === 'string') console.debug('[ProductsContext] stored refresh token prefix:', `${refreshToken.slice(0,8)}...`);
        } catch (e) {}
         // normalize refresh token if stored as object
         if (refreshToken && typeof refreshToken === 'object') {
           refreshToken = refreshToken.refreshToken || refreshToken.token || refreshToken.value || null;
         }
         if (refreshToken) {
           try {
             const refreshUrl = `${BASE_API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
             const rres = await fetch(refreshUrl, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              // some backends expect { refreshToken } or { token } - include both keys to be robust
              body: JSON.stringify({ refreshToken, token: refreshToken, refresh_token: refreshToken }),
             });
            console.debug('[ProductsContext] refresh POST status', rres.status);
            const rjson = await rres.json().catch(() => null);
            console.debug('[ProductsContext] refresh response', rjson);
            if (rres.ok) {
               // try to read tokens from common locations
              const newAccess = rjson?.accessToken || rjson?.token || rjson?.data?.accessToken || rjson?.data?.token || rjson?.access_token || null;
              const newRefresh = rjson?.refreshToken || rjson?.data?.refreshToken || rjson?.refresh_token || null;
               if (newAccess) {
                 await setAccessToken(newAccess);
                 if (newRefresh) await setRefreshToken(newRefresh);
                 // Try several header formats for the retried GET in case backend expects raw token or custom header
                 const candidates = [];
                 // Prefer Bearer form
                 candidates.push(newAccess.startsWith('Bearer ') ? newAccess : `Bearer ${newAccess}`);
                 // Raw token (no Bearer)
                 candidates.push(newAccess);
                 // Also try x-access-token as a fallback header
                 // We'll attempt Authorization header variants first, then x-access-token

                 let retryRes = null;
                 // Try Authorization header variants
                 for (const cand of candidates) {
                   const tryHeaders = { ...headers, Authorization: cand };
                   try {
                     console.debug('[ProductsContext] Retry attempt with Authorization prefix:', cand.startsWith('Bearer ') ? 'Bearer' : 'Raw');
                     retryRes = await doGet(url, tryHeaders);
                     const bodyText = await retryRes.clone().text().catch(() => null);
                     console.debug('[ProductsContext] Retry GET status', retryRes.status, 'body:', bodyText ? (bodyText.length > 200 ? bodyText.slice(0,200) + '...' : bodyText) : '<empty>');
                   } catch (e) {
                     console.debug('[ProductsContext] Retry GET attempt failed', e.message || e);
                     retryRes = { status: 0 };
                   }
                   if (retryRes.status !== 401) {
                     res = retryRes;
                     break;
                   }
                 }

                 // If still 401, try x-access-token header
                 if (retryRes && retryRes.status === 401) {
                   const tryHeaders2 = { ...headers };
                   // remove Authorization if present
                   delete tryHeaders2.Authorization;
                   try {
                     console.debug('[ProductsContext] Retry attempt with x-access-token (prefix shown)');
                     retryRes = await doGet(url, tryHeaders2);
                     const bodyText2 = await retryRes.clone().text().catch(() => null);
                     console.debug('[ProductsContext] Retry GET status (x-access-token)', retryRes.status, 'body:', bodyText2 ? (bodyText2.length > 200 ? bodyText2.slice(0,200) + '...' : bodyText2) : '<empty>');
                     if (retryRes.status !== 401) {
                       res = retryRes;
                     }
                   } catch (e) {
                     console.debug('[ProductsContext] Retry GET x-access-token attempt failed', e.message || e);
                   }
                 }
               } else {
                 setError('Refresh failed: no token');
                 setProducts([]);
                 setLoading(false);
                 return;
               }
             } else {
               setError('Refresh failed');
               setProducts([]);
               setLoading(false);
               return;
             }
           } catch (refreshErr) {
             setError(refreshErr.message || refreshErr);
             setProducts([]);
             setLoading(false);
             return;
           }
         } else {
           setError('Unauthorized');
           setProducts([]);
           setLoading(false);
           return;
         }
       }
       if (res.status === 401) {
         setError('Unauthorized');
         // keep cached data if available, otherwise clear
         if (!cachedRaw) setProducts([]);
         setLoading(false);
         return;
       }
       if (!res.ok) {
         setError(`HTTP ${res.status}`);
         if (!cachedRaw) setProducts([]);
         setLoading(false);
         return;
       }
       const json = await res.json();
      const items = Array.isArray(json) ? json : (json.data || json.products || []);
      // helper to determine whether API returned new data compared to cache
      const isNewData = (cache, freshItems) => {
        if (!cache || !Array.isArray(cache.items)) return true;
        const cachedIds = new Set((cache.items || []).map(p => p._id || p.productId || p.id));
        if ((cache.items || []).length !== (freshItems || []).length) return true;
        for (const it of (freshItems || [])) {
          const id = it._id || it.productId || it.id;
          if (!cachedIds.has(id)) return true;
        }
        return false;
      };

      const newData = isNewData(cachedRaw, items);
      if (newData) {
        try {
          const ts = Date.now();
          await StorageService.setItem(cacheKey, { items, meta: json.meta || {}, ts });
        } catch (e) {
          console.debug('[ProductsContext] Failed to persist products cache', e);
        }
        setProducts(items.map(normalizeProduct));
        setLastUpdated(Date.now());
      } else {
        // no new data: leave UI as-is (cached was used earlier);
        // but still update params so pagination/search state is current
      }
      // params already updated at start of function via functional setParams
    } catch (err) {
      setError(err.message || err);
      // on network error, keep cached products if any
    } finally {
      setLoading(false);
    }
   }, [params]); // Include params so fetchProducts has access to current state

   // initial load
   useEffect(() => {
     // Trigger initial fetch using default params; fetchProducts will serve cache immediately if present
     fetchProducts();
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   return (
     <ProductsContext.Provider value={{ products, loading, error, fetchProducts, setProducts, params, setParams, lastUpdated }}>
       {children}
     </ProductsContext.Provider>
   );
 };
