/**
 * ProductsContext Provider
 *
 * Manages product data fetching, caching, and normalization.
 * Handles API interactions for:
 * - Retrieving all products with filtering/search (fetchProducts)
 * - Fetching vendor-specific menus (fetchRestaurantMenu)
 * - Loading business and product categories (fetchBusinessCategories, fetchProductCategories)
 * 
 * Implements robust caching, token refresh/retry logic, and data normalization
 * to ensure a consistent data shape across the UI.
 */
import React, { createContext, useContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../utils/storage';
import StorageService from '../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import formatCurrency from '../utils/currency';

const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PRODUCTS.GET_ALL}`;

// Cache TTL: 5 minutes default
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

const ProductsContext = createContext(null);

/**
 * Hook to access the ProductsContext.
 * @returns {Object} The products context value.
 */
export const useProducts = () => useContext(ProductsContext);

/**
 * Normalizes raw product data from the API into a consistent internal format.
 * Handles various legacy data shapes, nested vendor objects, and ID resolution strategies.
 *
 * @param {Object} p - The raw product object from the API.
 * @returns {Object} The normalized product object.
 */
export function normalizeProduct(p) {
  const raw = p._raw || p;

  // --- Vendor Data Extraction ---
  // API returns vendorId as either a string or a populated object.
  let vendorSource = raw.vendor || {};
  if (raw.vendorId && typeof raw.vendorId === 'object') {
    vendorSource = { ...vendorSource, ...raw.vendorId };
  } else if (raw.vendorId && typeof raw.vendorId === 'string') {
    vendorSource.vendorId = raw.vendorId;
  }

  const businessDetails = vendorSource.businessDetails || {};
  const businessLocation = vendorSource.businessLocation || {};

  // --- ID Resolution ---
  // Prioritize distinct SKU-like IDs (PROD-...) over generic MongoIds if available
  const idCandidates = [raw.productId, raw._id, raw.id, p._id, p.id];
  let chosenId = null;

  // 1. Look for 'PROD-' format
  for (const c of idCandidates) {
    if (c && typeof c === 'string' && /^PROD-/i.test(c)) { chosenId = c; break; }
  }
  // 2. Fallback to any string ID, or generate random if absolutely missing (failsafe)
  if (!chosenId) {
    chosenId = idCandidates.find(c => c && typeof c === 'string') || `${Math.random().toString(36).slice(2)}`;
  }

  // --- Pricing ---
  const pricing = raw.pricing || {};
  const price = Number(pricing.price ?? raw.price ?? p.price ?? 0) || 0;
  const discountRaw = pricing.discount ?? raw.discount ?? 0;
  // tax is unused but extracted for completeness
  const taxRaw = pricing.tax ?? raw.tax ?? 0; // eslint-disable-line no-unused-vars
  const finalPriceRaw = pricing.finalPrice ?? raw.finalPrice;

  // Use backend calculation if valid, otherwise fallback to base price
  let finalPrice = Number(finalPriceRaw);
  if (!Number.isFinite(finalPrice)) finalPrice = price;

  // --- Vendor Details ---
  const vendorName = vendorSource.businessName || businessDetails.businessName || vendorSource.vendorName || raw.name || raw.productName || p.name || 'Unknown';

  // Normalize vendor/business type
  let vendorType = vendorSource.businessType || businessDetails.businessType || vendorSource.vendorType || '';
  if (vendorType) {
    vendorType = String(vendorType).toUpperCase().trim();
    if (vendorType === 'RESTAURENT') vendorType = 'RESTAURANT'; // Fix known API typo
  }

  const vendorRating = (vendorSource.rating && typeof vendorSource.rating === 'number') ? vendorSource.rating : 0;
  const vendorLat = vendorSource.latitude || businessLocation.latitude;
  const vendorLng = vendorSource.longitude || businessLocation.longitude;
  const documents = vendorSource.documents || {};
  const vendorStorePhoto = documents.storePhoto || vendorSource.storePhoto || vendorSource.logo || null;

  return {
    _raw: raw,
    id: chosenId,
    // Prioritize specific product images, avoid falling back to generic store photo for product thumbs
    image: raw.image || (Array.isArray(raw.images) && raw.images[0]) || null,
    name: raw.name || raw.productName || p.name || 'Unknown',
    categories: Array.isArray(raw.tags) ? raw.tags : (raw.category ? [raw.category] : []),
    rating: (raw.rating && (typeof raw.rating === 'number' ? raw.rating : raw.rating.average)) || vendorRating || 0,
    deliveryTime: raw.deliveryTime || vendorSource.deliveryTime || '',
    distance: raw.distance || '',

    // Formatting
    deliveryFee: formatCurrency(pricing.currency || raw.currency || '', price),
    offer: (pricing.discount || raw.discount) ? `${pricing.discount || raw.discount}% OFF` : null,

    // Normalized numerical values for logic usage
    price: price,
    finalPrice: finalPrice,
    currency: pricing.currency || raw.currency || '',

    // Normalized Vendor Object
    vendor: {
      id: vendorSource._id || vendorSource.vendorId || vendorSource.id,
      vendorName: vendorName,
      vendorType: vendorType,
      rating: vendorRating,
      latitude: vendorLat,
      longitude: vendorLng,
      storePhoto: vendorStorePhoto,
      isStoreOpen: businessDetails.isStoreOpen ?? vendorSource.isStoreOpen,
      address: businessLocation.address,
      deliveryTime: raw.deliveryTime || vendorSource.deliveryTime || ''
    }
  };
}

/**
 * ProductsProvider Component
 * 
 * Provides global product state and API methods.
 */
export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 1000 });

  // Rate Limiting & Caching Refs
  const isFetchingRef = useRef(false);
  const lastFetchedRef = useRef(0);
  const FETCH_THRESHOLD_MS = 60000; // 60 seconds for products

  const businessCategoriesCache = useRef(null);
  const lastBusinessCategoriesFetch = useRef(0);

  const productCategoriesCache = useRef(null);
  const lastProductCategoriesFetch = useRef(0);
  const CATEGORY_CACHE_TTL = 300000; // 5 minutes for categories (rarely change)

  // Use ref for params to avoid infinite loops in dependency arrays
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  /**
   * Main function to fetch all products.
   * Features:
   * - Caching: Uses local storage to cache responses for 5 minutes.
   * - Optimization: Serves cache immediately if fresh, then background updates if forced.
   * - Resilience: Auto-retries with token refresh on 401 Unauthorized.
   * - Robustness: handles various header formats and backend quirks.
   *
   * @param {Object} overrides - Query parameter overrides (filters, location, etc).
   */
  const fetchProducts = useCallback(async (overrides = {}) => {
    setError(null);
    try {
      // Setup query parameters
      const final = { ...paramsRef.current, ...overrides };
      const qs = new URLSearchParams();
      if (final.search) qs.set('search', final.search);
      if (final.category) qs.set('category', final.category);
      if (final.vendorType) qs.set('vendorType', final.vendorType);
      if (final.tags) qs.set('tags', Array.isArray(final.tags) ? final.tags.join(',') : final.tags);
      if (final.lat) qs.set('lat', final.lat);
      if (final.lng) qs.set('lng', final.lng);
      qs.set('page', final.page || 1);
      qs.set('limit', final.limit || 1000);

      // Construct URL and Cache Key
      const url = `${API_URL}?${qs.toString()}`;
      const cacheKey = `productsCache:${qs.toString()}`;
      console.log('[ProductsContext] Fetching:', url);

      // --- Cache Retrieval ---
      let cachedRaw = null;
      try {
        cachedRaw = await StorageService.getItem(cacheKey);
        if (cachedRaw && Array.isArray(cachedRaw.items) && cachedRaw.items.length > 0) {
          // HIT: Serve cache immediately
          setProducts((cachedRaw.items || []).map(normalizeProduct));
          if (cachedRaw.ts) setLastUpdated(cachedRaw.ts);
        }
      } catch (e) { /* ignore cache read errors */ }

      // --- Cache Freshness Check (SWR Strategy) ---
      // FRESH: < 60s, return cache only
      // STALE: 60s - 5min, return cache + background refresh
      // EXPIRED: > 5min, show loading + fetch
      const FRESH_TTL = 60 * 1000;  // 60 seconds
      const STALE_TTL = PRODUCTS_CACHE_TTL_MS; // 5 minutes

      const cacheAge = cachedRaw && cachedRaw.ts ? (Date.now() - cachedRaw.ts) : Infinity;
      const hadCache = cachedRaw && Array.isArray(cachedRaw.items) && cachedRaw.items.length > 0;

      // FRESH: Cache is very recent, skip network entirely
      if (!final.force && hadCache && cacheAge < FRESH_TTL) {
        console.debug('[ProductsContext] Cache FRESH, skipping network');
        return;
      }

      // STALE: Cache exists but aging, show cache + background refresh (no loading spinner)
      const isBackgroundRefresh = hadCache && cacheAge >= FRESH_TTL && cacheAge < STALE_TTL;
      if (isBackgroundRefresh && !final.force) {
        console.debug('[ProductsContext] Cache STALE, background refresh...');
        // Don't set loading, just continue to fetch silently
      }

      // EXPIRED: Cache too old or no cache, show loading
      const isExpired = !hadCache || cacheAge >= STALE_TTL;

      // Concurrency & Rate Limiting Check
      if (isFetchingRef.current) {
        console.debug('[ProductsContext] Fetch already in progress, skipping concurrent request.');
        return;
      }

      const now = Date.now();
      // If we have data in memory (products state not empty) and it's recent, skip
      if (!final.force && !isBackgroundRefresh && products.length > 0 && (now - lastFetchedRef.current < FETCH_THRESHOLD_MS)) {
        console.debug(`[ProductsContext] Throttled. Last fetch ${now - lastFetchedRef.current}ms ago.`);
        return;
      }

      isFetchingRef.current = true;
      // Show loading when no cache exists (first load or expired)
      if (!hadCache) setLoading(true);

      // --- Authorization Setup ---
      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || token.value || null;

      const headers = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // --- Network Request ---
      const doFetch = (u, h) => fetch(u, { method: 'GET', headers: h });
      let res = await doFetch(url, headers);

      // --- 401 Token Refresh & Retry Logic ---
      if (res.status === 401) {
        console.log('[ProductsContext] 401 Unauthorized, attempting to refresh token...');

        let refreshToken = await getRefreshToken();
        if (refreshToken && typeof refreshToken === 'object') {
          refreshToken = refreshToken.refreshToken || refreshToken.token || refreshToken.value || null;
        }

        if (refreshToken) {
          // Attempt refresh endpoint
          const refreshUrl = `${BASE_API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
          const rres = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken, token: refreshToken, refresh_token: refreshToken }),
          });

          if (rres.ok) {
            const rjson = await rres.json().catch(() => null);
            const newAccess = rjson?.accessToken || rjson?.token || rjson?.data?.accessToken || null;
            const newRefresh = rjson?.refreshToken || rjson?.data?.refreshToken || null;

            if (newAccess) {
              await setAccessToken(newAccess);
              if (newRefresh) await setRefreshToken(newRefresh);

              // Re-attempt original request with new token
              // Try standard Bearer and plain/x-access-token strategies
              const candidates = [
                newAccess.startsWith('Bearer ') ? newAccess : `Bearer ${newAccess}`,
                newAccess.startsWith('Bearer ') ? newAccess.substring(7) : newAccess
              ];

              let retrySuccess = false;
              for (const authHeader of candidates) {
                try {
                  const retryHeaders = { ...headers, Authorization: authHeader };
                  const retryRes = await doFetch(url, retryHeaders);
                  if (retryRes.status !== 401) {
                    res = retryRes;
                    retrySuccess = true;
                    break;
                  }
                } catch (e) { /* ignore retry fail */ }
              }

              if (!retrySuccess) {
                // Fallback: x-access-token
                try {
                  const xHeaders = { ...headers, 'x-access-token': newAccess };
                  delete xHeaders.Authorization;
                  const xRes = await doFetch(url, xHeaders);
                  if (xRes.status !== 401) {
                    res = xRes;
                    retrySuccess = true;
                  }
                } catch (e) { /* ignore */ }
              }
            }
          }
        }
      }

      // --- Final Response Handling ---
      if (res.status === 401) {
        setError('Unauthorized');
        if (!cachedRaw) setProducts([]);
        return;
      }

      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        if (!cachedRaw) setProducts([]);
        return;
      }

      const json = await res.json();

      // Extract items from response wrapper
      let items = [];
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json.data)) items = json.data;
      else if (Array.isArray(json.products)) items = json.products;
      else if (json.data && Array.isArray(json.data.products)) items = json.data.products;
      else if (Array.isArray(json.items)) items = json.items;

      // Update Cache if data changed
      const isNewData = (cache, freshItems) => {
        if (!cache || !Array.isArray(cache.items)) return true;
        if (cache.items.length !== freshItems.length) return true;

        // Simple distinct check on IDs
        const cachedIds = new Set(cache.items.map(p => p._id || p.productId || p.id));
        for (const it of freshItems) {
          const id = it._id || it.productId || it.id;
          if (!cachedIds.has(id)) return true;
        }
        return false;
      };

      if (final.force || isNewData(cachedRaw, items)) {
        // Filter out INACTIVE / deleted / unapproved products
        items = items.filter(item => {
          const status = item.meta?.status;
          if (status && status !== 'ACTIVE') return false;
          if (item.isDeleted) return false;
          if (item.isApproved === false) return false;
          return true;
        });

        await StorageService.setItem(cacheKey, { items, meta: json.meta || {}, ts: Date.now() });
        setProducts(items.map(normalizeProduct));
        setLastUpdated(Date.now());
      }
    } catch (err) {
      console.error('[ProductsContext] Fetch error:', err);
      setError(err.message || 'Error fetching products');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      if (!error) lastFetchedRef.current = Date.now();
    }
  }, []); // paramsRef dependency ensures stability


  /**
   * Fetches the specific menu/products for a given vendor.
   * Unlike general product fetch, this is uncached (or short-lived) to ensure
   * latest stock/status availability when viewing a restaurant.
   *
   * @param {string} vendorId - The vendor ID to fetch menu for.
   * @returns {Promise<Array>} Normalized list of products.
   */
  const fetchRestaurantMenu = useCallback(async (vendorId) => {
    if (!vendorId) return [];

    // Internal helper to simplify fetch calls
    const doFetch = async (u, h) => fetch(u, { headers: h });

    try {
      // --- Headers Setup ---
      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || null;

      const headers = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // --- URL Construction ---
      const endpoint = API_ENDPOINTS.PRODUCTS.GET_ALL;
      const url = `${BASE_API_URL}${endpoint}?vendor=${vendorId}&limit=100&_t=${Date.now()}`;
      console.log('[ProductsContext] Fetching menu for:', vendorId);

      let res = await doFetch(url, headers);

      // --- 401 Refresh Logic (Duplicated from fetchProducts for isolation) ---
      // Note: Ideally, this retry logic should be moved to a shared API utility/interceptor
      if (res.status === 401) {
        console.log('[ProductsContext] Menu fetch 401, refreshing...');
        let refreshToken = await getRefreshToken();

        if (refreshToken && typeof refreshToken === 'object') {
          refreshToken = refreshToken.refreshToken || refreshToken.token || null;
        }

        if (refreshToken) {
          const refreshUrl = `${BASE_API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
          const rres = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken, token: refreshToken, refresh_token: refreshToken })
          });

          if (rres.ok) {
            const rjson = await rres.json().catch(() => null);
            const newAccess = rjson?.accessToken || rjson?.token || null;
            const newRefresh = rjson?.refreshToken || rjson?.refresh_token || null;

            if (newAccess) {
              await setAccessToken(newAccess);
              if (newRefresh) await setRefreshToken(newRefresh);

              const retryHeaders = { ...headers, Authorization: newAccess.startsWith('Bearer ') ? newAccess : `Bearer ${newAccess}` };
              const retryRes = await doFetch(url, retryHeaders);
              if (retryRes.status !== 401) res = retryRes;
            }
          }
        }
      }

      if (!res.ok) {
        if (res.status === 401) return []; // Still unauthorized after retry
        console.warn('[ProductsContext] Menu fetch failed:', res.status);
        throw new Error(`Menu fetch failed: ${res.status}`);
      }

      const json = await res.json();

      // --- Parsing ---
      let items = [];
      if (Array.isArray(json)) items = json;
      else if (json.data && Array.isArray(json.data)) items = json.data;
      else if (json.data && Array.isArray(json.data.products)) items = json.data.products;
      else if (Array.isArray(json.products)) items = json.products;

      console.log(`[ProductsContext] Menu fetched: ${items.length} items`);

      // Filter out INACTIVE / deleted / unapproved products
      items = items.filter(item => {
        const status = item.meta?.status;
        if (status && status !== 'ACTIVE') return false;
        if (item.isDeleted) return false;
        if (item.isApproved === false) return false;
        return true;
      });

      console.log(`[ProductsContext] Menu after filtering: ${items.length} active items`);

      // Force update cache logic to prevent stale data conflicts
      try {
        await StorageService.removeKeysByPrefix('productsCache:');

        // Update local state by merging new items into existing cache logic
        const freshNormalized = items.map(normalizeProduct);
        setProducts(prev => {
          const freshMap = new Map(freshNormalized.map(p => [p.id, p]));
          return prev.map(p => {
            const norm = normalizeProduct(p);
            return freshMap.has(norm.id) ? freshMap.get(norm.id) : p;
          });
        });
      } catch (e) {
        console.warn('[ProductsContext] Cache clean warning:', e);
      }

      return items.map(normalizeProduct);

    } catch (err) {
      console.error('[ProductsContext] Error fetching menu:', err);
      throw err;
    }
  }, []);

  /**
   * Fetches business categories (e.g., Grocery, Restaurant, Pharmacy).
   * Caches result for 5 minutes.
   * @returns {Promise<Array>} List of business categories.
   */
  const fetchBusinessCategories = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && businessCategoriesCache.current && (now - lastBusinessCategoriesFetch.current < CATEGORY_CACHE_TTL)) {
      console.debug('[ProductsContext] Serving Business Categories from cache');
      return businessCategoriesCache.current;
    }

    try {
      const endpoint = API_ENDPOINTS.UTIL.BUSINESS_CATEGORIES;
      const url = `${BASE_API_URL}${endpoint}`;

      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || null;

      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const items = json.data?.data || [];

      const mapped = items.map(item => ({
        id: item._id,
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        isActive: item.isActive
      }));

      // Update Cache
      businessCategoriesCache.current = mapped;
      lastBusinessCategoriesFetch.current = Date.now();

      return mapped;
    } catch (err) {
      console.error('[ProductsContext] Business Categories Error:', err);
      return [];
    }
  }, []);

  /**
   * Fetches product categories (cuisines, item types).
   * Caches result for 5 minutes.
   * @returns {Promise<Array>} List of product categories.
   */
  const fetchProductCategories = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && productCategoriesCache.current && (now - lastProductCategoriesFetch.current < CATEGORY_CACHE_TTL)) {
      console.debug('[ProductsContext] Serving Product Categories from cache');
      return productCategoriesCache.current;
    }

    try {
      const endpoint = API_ENDPOINTS.UTIL.PRODUCT_CATEGORIES;
      const url = `${BASE_API_URL}${endpoint}`;

      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || null;

      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const items = json.data?.data || [];

      const mapped = items.map(item => ({
        id: item._id,
        _id: item._id,
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        image: item.icon, // Compatibility alias
        businessCategoryId: item.businessCategoryId,
        isActive: item.isActive
      }));

      // Update Cache
      productCategoriesCache.current = mapped;
      lastProductCategoriesFetch.current = Date.now();

      return mapped;
    } catch (err) {
      console.error('[ProductsContext] Product Categories Error:', err);
      return [];
    }
  }, []);

  /**
   * Fetches full details for a single product by ID or SKU.
   * Useful for getting extended data not present in list views (e.g. nutrition, full descriptions).
   *
   * @param {string} productId - ID or SKU of the product
   */
  const fetchProductDetails = useCallback(async (productId) => {
    if (!productId) return null;

    // Check cache/existing products first?
    // Usually we want fresh data for details, but could return existing as placeholder.

    try {
      let token = await getAccessToken();
      if (token && typeof token === 'object') token = token.accessToken || token.token || null;

      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const url = `${BASE_API_URL}${API_ENDPOINTS.PRODUCTS.GET_ALL}/${productId}`; // Assumes /products/:id
      console.log('[ProductsContext] Fetching details:', url);

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const raw = json.data || json.product || json;

      return normalizeProduct(raw);
    } catch (err) {
      console.error('[ProductsContext] Failed to fetch product details:', err);
      return null;
    }
  }, []);

  /**
   * Initial mount effect: Start fetching products.
   * Relies on internal cache logic to avoid redundant network calls.
   */
  useEffect(() => {
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
    lastUpdated,
    fetchRestaurantMenu,
    fetchBusinessCategories,
    fetchProductCategories,
    fetchProductDetails // Add the new function here
  }), [products, loading, error, fetchProducts, setProducts, params, setParams, lastUpdated, fetchRestaurantMenu, fetchBusinessCategories, fetchProductCategories, fetchProductDetails]);

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  );
};
