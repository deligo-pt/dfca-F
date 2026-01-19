import React, { createContext, useContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../utils/storage';
import StorageService from '../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import formatCurrency from '../utils/currency';

const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PRODUCTS.GET_ALL}`;
// Cache TTL in milliseconds (default 5 minutes)
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const ProductsContext = createContext(null);

export const useProducts = () => useContext(ProductsContext);

export function normalizeProduct(p) {
  const raw = p._raw || p;

  // Handle nested vendorId object structure
  // API now returns vendorId as an object with businessDetails
  let vendorSource = raw.vendor || {};
  if (raw.vendorId && typeof raw.vendorId === 'object') {
    // If vendorId is an object, it contains the vendor details
    vendorSource = { ...vendorSource, ...raw.vendorId };
  } else if (raw.vendorId && typeof raw.vendorId === 'string') {
    // If vendorId is just an ID string, keep it
    vendorSource.vendorId = raw.vendorId;
  }

  // Extract Flattened props from vendorSource (which might be raw.vendor or raw.vendorId)
  const businessDetails = vendorSource.businessDetails || {};
  const businessLocation = vendorSource.businessLocation || {};

  // Robust ID extraction
  // Prioritize SKU-like IDs if available, else standard IDs
  const idCandidates = [raw.productId, raw._id, raw.id, p._id, p.id];
  let chosenId = null;
  for (const c of idCandidates) {
    if (c && typeof c === 'string' && /^PROD-/i.test(c)) { chosenId = c; break; }
  }
  if (!chosenId) chosenId = idCandidates.find(c => c && typeof c === 'string') || `${Math.random().toString(36).slice(2)}`;

  // Pricing extraction
  const pricing = raw.pricing || {};
  const price = Number(pricing.price ?? raw.price ?? p.price ?? 0) || 0;
  const discountRaw = pricing.discount ?? raw.discount ?? 0;
  const taxRaw = pricing.tax ?? raw.tax ?? 0;
  const finalPriceRaw = pricing.finalPrice ?? raw.finalPrice;
  // Trust backend finalPrice if present, else calc
  let finalPrice = Number(finalPriceRaw);
  if (!Number.isFinite(finalPrice)) finalPrice = price;

  // Extract Vendor Details
  const vendorName = vendorSource.businessName || businessDetails.businessName || vendorSource.vendorName || raw.name || raw.productName || p.name || 'Unknown';
  // Check both businessType (new) and vendorType (old)
  let vendorType = vendorSource.businessType || businessDetails.businessType || vendorSource.vendorType || '';

  // Just trim and uppercase, do NOT merge different spellings as per user request
  if (vendorType) {
    vendorType = String(vendorType).toUpperCase().trim();
  }

  const vendorRating = (vendorSource.rating && typeof vendorSource.rating === 'number') ? vendorSource.rating : 0;
  const vendorLat = vendorSource.latitude || businessLocation.latitude;
  const vendorLng = vendorSource.longitude || businessLocation.longitude;
  // Extract documents if available
  const documents = vendorSource.documents || {};
  const vendorStorePhoto = documents.storePhoto || vendorSource.storePhoto || vendorSource.logo || null;

  return {
    _raw: raw,
    id: chosenId,
    // Fix: Prioritize product images over store photo, and do NOT fallback to storePhoto for product cards logic
    image: raw.image || (Array.isArray(raw.images) && raw.images[0]) || null,
    name: raw.name || raw.productName || p.name || 'Unknown',
    categories: Array.isArray(raw.tags) ? raw.tags : (raw.category ? [raw.category] : []),
    rating: (raw.rating && (typeof raw.rating === 'number' ? raw.rating : raw.rating.average)) || vendorRating || 0,
    deliveryTime: raw.deliveryTime || vendorSource.deliveryTime || '',
    distance: raw.distance || '',
    // Use formatCurrency with the extracted currency
    deliveryFee: formatCurrency(pricing.currency || raw.currency || '', price),
    offer: (pricing.discount || raw.discount) ? `${pricing.discount || raw.discount}% OFF` : null,
    // Expose normalized pricing for components to use
    price: price,
    finalPrice: finalPrice,
    currency: pricing.currency || raw.currency || '',

    // Normalized vendor object
    vendor: {
      id: vendorSource._id || vendorSource.vendorId || vendorSource.id,
      vendorName: vendorName,
      vendorType: vendorType, // Important for classification
      rating: vendorRating,
      latitude: vendorLat,
      longitude: vendorLng,
      storePhoto: vendorStorePhoto,
      isStoreOpen: businessDetails.isStoreOpen ?? vendorSource.isStoreOpen,
      address: businessLocation.address // if available
    }
  };
}

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 1000 });

  // Use ref to store params to avoid infinite loops
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fetchProducts = useCallback(async (overrides = {}) => {
    // Do not set loading immediately to avoid UI flicker when we can serve cached data.
    setError(null);

    try {
      // Merge current params with overrides without triggering re-renders
      const final = { ...paramsRef.current, ...overrides };

      let token = await getAccessToken();
      // handle tokens stored as objects { accessToken } or { token }
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value || null;
      }
      // Redacted debug: show only prefix to avoid leaking full token
      try {
        console.debug('[ProductsContext] stored access token:', token ? `${String(token).slice(0, 8)}...` : null);
      } catch (e) { }
      const headers = { Accept: 'application/json' };
      if (token) {
        // Backend now expects Bearer token
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
      }

      const qs = new URLSearchParams();
      if (final.search) qs.set('search', final.search);
      if (final.category) qs.set('category', final.category);
      if (final.vendorType) qs.set('vendorType', final.vendorType);
      if (final.tags) qs.set('tags', Array.isArray(final.tags) ? final.tags.join(',') : final.tags);
      if (final.lat) qs.set('lat', final.lat);
      if (final.lng) qs.set('lng', final.lng);
      qs.set('page', final.page || 1);
      qs.set('limit', final.limit || 1000);

      // Explicit overrides only - no auto-injection
      if (final.lat && final.lng) {
        qs.set('lat', final.lat);
        qs.set('lng', final.lng);
      }

      const url = `${API_URL}?${qs.toString()}`;
      console.log('[ProductsContext] Generated URL:', url, 'Params:', JSON.stringify(final));
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
          } catch (e) { }
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
        console.debug('[ProductsContext] GET status', res.status, 'body:', bodyText ? (bodyText.length > 200 ? bodyText.slice(0, 200) + '...' : bodyText) : '<empty>');
      } catch (e) {
        console.debug('[ProductsContext] GET status', res.status, '(no body)');
      }
      // If unauthorized, attempt refresh once
      if (res.status === 401) {
        // try to refresh token
        let refreshToken = await getRefreshToken();
        try {
          console.debug('[ProductsContext] stored refresh token present?', !!refreshToken);
          if (refreshToken && typeof refreshToken === 'string') console.debug('[ProductsContext] stored refresh token prefix:', `${refreshToken.slice(0, 8)}...`);
        } catch (e) { }
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
                // Bearer form - PRIMARY strategy
                candidates.push(newAccess.startsWith('Bearer ') ? newAccess : `Bearer ${newAccess}`);
                // Raw token (no Bearer) as fallback
                candidates.push(newAccess.startsWith('Bearer ') ? newAccess.substring(7) : newAccess);
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
                    console.debug('[ProductsContext] Retry GET status', retryRes.status, 'body:', bodyText ? (bodyText.length > 200 ? bodyText.slice(0, 200) + '...' : bodyText) : '<empty>');
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
                  tryHeaders2['x-access-token'] = newAccess;
                  try {
                    console.debug('[ProductsContext] Retry attempt with x-access-token');
                    retryRes = await doGet(url, tryHeaders2);
                    const bodyText2 = await retryRes.clone().text().catch(() => null);
                    console.debug('[ProductsContext] Retry GET status (x-access-token)', retryRes.status, 'body:', bodyText2 ? (bodyText2.length > 200 ? bodyText2.slice(0, 200) + '...' : bodyText2) : '<empty>');
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
      // Robust parsing of response structure
      let items = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (Array.isArray(json.data)) {
        items = json.data;
      } else if (Array.isArray(json.products)) {
        items = json.products;
      } else if (Array.isArray(json.items)) {
        items = json.items;
      } else if (json.data && Array.isArray(json.data.products)) {
        items = json.data.products;
      } else if (json.data && Array.isArray(json.data.items)) {
        items = json.data.items;
      }

      console.log(`[ProductsContext] Parsed ${items.length} items from API response`);

      // DEBUG: Inspect the first item to see vendor structure
      if (items.length > 0) {
        const first = items[0];
        console.log('[ProductsContext] Valid Product Sample:', JSON.stringify({
          id: first.id || first._id || first.productId,
          name: first.name || first.productName,
          vendorId: first.vendorId,
          vendor_object: first.vendor,
          raw_vendorId: first._raw?.vendor?.vendorId || first.vendor?.id || first.vendor?._id
        }, null, 2));
      }

      if (items.length === 0) {
        console.log('[ProductsContext] API returned 0 items. Full response keys:', Object.keys(json));
      }
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

      // If forced refresh OR new data detected, update state and cache
      if (final.force || newData) {
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
    } catch (err) {
      setError(err.message || err);
      // on network error, keep cached products if any
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - using paramsRef.current to avoid infinite loop

  // Fetch specific restaurant menu (direct, no caching for instant updates)
  const fetchRestaurantMenu = useCallback(async (vendorId) => {
    if (!vendorId) return [];

    // Helper to perform fetch
    const doFetch = async (u, h) => fetch(u, { headers: h });

    try {
      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || null;

      const headers = { Accept: 'application/json' };
      if (token) {
        // Backend now expects Bearer token
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
      }

      // Use the generic products endpoint with a vendor filter
      const endpoint = API_ENDPOINTS.PRODUCTS.GET_ALL;
      const url = `${BASE_API_URL}${endpoint}?vendor=${vendorId}&limit=100&_t=${Date.now()}`;

      console.log('[ProductsContext] Fetching menu for vendor:', vendorId, url);
      let res = await doFetch(url, headers);

      // Handle 401 with retry logic similar to fetchProducts
      if (res.status === 401) {
        console.log('[ProductsContext] Menu fetch got 401, attempting refresh...');
        let refreshToken = await getRefreshToken();

        // Normalize refresh token
        if (refreshToken && typeof refreshToken === 'object') {
          refreshToken = refreshToken.refreshToken || refreshToken.token || refreshToken.value || null;
        }

        if (refreshToken) {
          try {
            const refreshUrl = `${BASE_API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
            const rres = await fetch(refreshUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ refreshToken, token: refreshToken, refresh_token: refreshToken }),
            });

            if (rres.ok) {
              const rjson = await rres.json().catch(() => null);
              const newAccess = rjson?.accessToken || rjson?.token || rjson?.data?.accessToken || rjson?.data?.token || rjson?.access_token || null;
              const newRefresh = rjson?.refreshToken || rjson?.data?.refreshToken || rjson?.refresh_token || null;

              if (newAccess) {
                await setAccessToken(newAccess);
                if (newRefresh) await setRefreshToken(newRefresh);

                // Retry with new token using robust header candidates
                console.log('[ProductsContext] Token refreshed, retrying menu fetch');

                const candidates = [];
                // Bearer form - PRIMARY strategy
                candidates.push(newAccess.startsWith('Bearer ') ? newAccess : `Bearer ${newAccess}`);
                // Raw token (no Bearer) as fallback
                candidates.push(newAccess.startsWith('Bearer ') ? newAccess.substring(7) : newAccess);

                let retryRes = null;
                // Try Authorization header variants
                for (const cand of candidates) {
                  const tryHeaders = { ...headers, Authorization: cand };
                  try {
                    console.log('[ProductsContext] Retry attempt with Authorization prefix:', cand.startsWith('Bearer ') ? 'Bearer' : 'Raw');
                    retryRes = await doFetch(url, tryHeaders);
                  } catch (e) {
                    retryRes = { status: 0 };
                  }
                  if (retryRes && retryRes.status !== 401) {
                    res = retryRes;
                    break;
                  }
                }

                // If still 401, try x-access-token header
                if (retryRes && retryRes.status === 401) {
                  const tryHeaders2 = { ...headers };
                  delete tryHeaders2.Authorization;
                  tryHeaders2['x-access-token'] = newAccess;
                  try {
                    console.log('[ProductsContext] Retry attempt with x-access-token');
                    retryRes = await doFetch(url, tryHeaders2);
                    if (retryRes.status !== 401) {
                      res = retryRes;
                    }
                  } catch (e) { }
                }
              }
            } else {
              console.warn('[ProductsContext] Refresh token failed during menu fetch');
            }
          } catch (refreshErr) {
            console.error('[ProductsContext] Refresh error during menu fetch:', refreshErr);
          }
        }
      }

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[ProductsContext] Menu fetch failed with 401 (Unauthorized) - returning empty menu');
          return [];
        }
        console.warn('[ProductsContext] Menu fetch failed:', res.status);
        throw new Error(`Menu fetch failed: ${res.status}`);
      }

      const json = await res.json();
      console.log('[ProductsContext] Raw Menu Response:', JSON.stringify(json).slice(0, 500)); // Log first 500 chars

      let items = [];
      // Robust parsing similar to fetchProducts
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json.data)) items = json.data;
      else if (Array.isArray(json.products)) items = json.products;
      else if (Array.isArray(json.items)) items = json.items;
      else if (json.data && Array.isArray(json.data.products)) items = json.data.products;

      console.log(`[ProductsContext] Menu fetched: ${items.length} items`);

      // FIX: CLEAR ALL product caches to ensure fresh data on next startup ("native fill")
      // This forces fetchProducts to do a fresh network call instead of using ANY stale cache
      try {
        // 1. Clear ALL product caches using prefix removal - this ensures no cache key mismatch issues
        await StorageService.removeKeysByPrefix('productsCache:');
        console.log('[ProductsContext] CLEARED ALL product caches - will fetch fresh on next startup');

        // 2. Also update in-memory state immediately with fresh data
        const freshNormalized = items.map(normalizeProduct);
        setProducts(prev => {
          const freshMap = new Map();
          freshNormalized.forEach(p => freshMap.set(p.id, p));
          return prev.map(p => {
            const normP = normalizeProduct(p);
            if (freshMap.has(normP.id)) {
              return freshMap.get(normP.id);
            }
            return p;
          });
        });
        console.log('[ProductsContext] Updated in-memory products state');

      } catch (cacheErr) {
        console.warn('[ProductsContext] Failed to clear cache:', cacheErr);
      }

      return items.map(normalizeProduct);
    } catch (err) {
      console.error('[ProductsContext] Error fetching menu:', err);
      throw err;
    }
  }, []);

  // Fetch business categories
  const fetchBusinessCategories = useCallback(async () => {
    try {
      const endpoint = API_ENDPOINTS.UTIL.BUSINESS_CATEGORIES;
      const url = `${BASE_API_URL}${endpoint}`;

      let token = await getAccessToken();
      // handle tokens stored as objects { accessToken } or { token }
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value || null;
      }

      const headers = { Accept: 'application/json' };
      if (token) {
        // Backend now expects Bearer token
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('[ProductsContext] fetchBusinessCategories status:', res.status);

      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);

      const json = await res.json();
      console.log('[ProductsContext] fetchBusinessCategories response:', JSON.stringify(json).slice(0, 200));

      const items = json.data?.data || [];
      console.log('[ProductsContext] fetchBusinessCategories items count:', items.length);

      return items.map(item => ({
        id: item._id,
        name: item.name,
        slug: item.slug,
        icon: item.icon, // This is now a URL URL
        isActive: item.isActive
      }));
    } catch (err) {
      console.error('[ProductsContext] Error fetching business categories:', err);
      return [];
    }
  }, []);

  // Fetch product categories (Cuisines)
  const fetchProductCategories = useCallback(async () => {
    try {
      const endpoint = API_ENDPOINTS.UTIL.PRODUCT_CATEGORIES;
      const url = `${BASE_API_URL}${endpoint}`;

      let token = await getAccessToken();
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value || null;
      }

      const headers = { Accept: 'application/json' };
      if (token) {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
      }

      const res = await fetch(url, { method: 'GET', headers });

      if (!res.ok) throw new Error(`Failed to fetch product categories: ${res.status}`);

      const json = await res.json();
      const items = json.data?.data || [];

      return items.map(item => ({
        id: item._id,
        name: item.name,
        slug: item.slug,
        icon: item.icon, // URL
        image: item.icon, // For compatibility with CuisineChip
        isActive: item.isActive
      }));
    } catch (err) {
      console.error('[ProductsContext] Error fetching product categories:', err);
      return [];
    }
  }, []);

  // initial load
  useEffect(() => {
    // Trigger initial fetch using default params; fetchProducts will serve cache immediately if present
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue = useMemo(() => ({
    products,
    loading,
    error,
    fetchProducts,
    setProducts,
    params,
    setParams,
    setParams,
    lastUpdated,
    fetchRestaurantMenu,
    fetchBusinessCategories,
    fetchProductCategories
  }), [products, loading, error, fetchProducts, params, lastUpdated, fetchRestaurantMenu, fetchBusinessCategories, fetchProductCategories]);

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  );
};
