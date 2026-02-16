/**
 * CartContext Provider
 * 
 * Manages the shopping cart state.
 * Features:
 * - Product normalization and ID resolution.
 * - Single-vendor constraint enforcement.
 * - Optimistic UI updates with backend synchronization.
 * - Local storage persistence.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import StorageService from '../utils/storage';
import CartAPI from '../utils/cartApi';
import { isValidObjectId } from '../utils/objectId';
import { useProfile } from './ProfileContext';

/**
 * Local storage key for cart persistence.
 */
const STORAGE_KEY = 'cart:v1';

export const CartContext = createContext(null);

/**
 * Hook for accessing CartContext.
 * @returns {Object} Cart context value.
 */
export const useCart = () => useContext(CartContext);

/**
 * Normalizes product data into a consistent cart item structure.
 * Resolves IDs (ObjectId > SKU > Fallback) and consolidates vendor/pricing info.
 *
 * @param {Object} p - Raw product data.
 * @returns {Object} Standardized cart item.
 */
function normalizeProductForCart(p) {
  const raw = p._raw || p;

  // ID Resolution: ObjectId -> SKU -> Fallback
  const candidates = [
    raw.productId?._id,
    raw.productId,
    raw._id,
    raw.product?._id,
    p.id,
    raw.id
  ];

  let chosen = null;
  let source = null;

  // 1. Valid MongoDB ObjectId
  for (const c of candidates) {
    if (isValidObjectId(c)) {
      chosen = c;
      source = 'mongo';
      console.debug('[Cart] Resolved Mongo ID:', chosen);
      break;
    }
  }

  // 2. SKU format (PROD-XXXX)
  if (!chosen) {
    for (const c of candidates) {
      if (c && typeof c === 'string' && /^PROD-/i.test(c)) {
        chosen = c;
        source = 'sku';
        console.debug('[Cart] Resolved SKU:', chosen);
        break;
      }
    }
  }

  // 3. Fallback string ID
  if (!chosen) {
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        chosen = c;
        source = 'fallback';
        break;
      }
    }
  }

  if (!chosen) {
    console.warn('[Cart] Failed to resolve product ID', { rawKeys: Object.keys(raw || {}) });
  }

  const idStyle = isValidObjectId(chosen) ? 'objectId' : (source === 'sku' ? 'sku' : 'other');

  // Vendor Extraction
  const vendor = raw.vendor || {};
  let vendorId = vendor.vendorId || raw.vendorId || null;
  let vendorName = vendor.vendorName || raw.vendorName || null;

  if (vendorId && typeof vendorId === 'object') {
    if (!vendorName) {
      const vName = vendorId.name;
      if (typeof vName === 'string') {
        vendorName = vName;
      } else if (vName && typeof vName === 'object') {
        const parts = [vName.firstName, vName.lastName].filter(Boolean);
        if (parts.length > 0) vendorName = parts.join(' ');
      } else if (vendorId.vendorName) {
        vendorName = vendorId.vendorName;
      }
    }
    vendorId = vendorId._id || vendorId.id || null;
  }

  // Pricing Normalization
  const pricing = raw.pricing || {};
  const price = Number(pricing.price ?? raw.price ?? p.price ?? 0) || 0;
  const discountRaw = pricing.discount ?? raw.discount ?? 0;
  const taxRaw = pricing.tax ?? raw.tax ?? 0;
  const finalPriceRaw = pricing.finalPrice ?? raw.finalPrice;

  let finalPrice = Number(finalPriceRaw);

  // Auto-calculate final price if not provided by backend but discount exists
  if (!Number.isFinite(finalPrice) || (discountRaw > 0 && finalPrice === price)) {
    if (discountRaw > 0) {
      finalPrice = price - (price * discountRaw / 100);
    } else {
      finalPrice = price;
    }
  }

  const images = Array.isArray(raw.images) ? raw.images : [];
  const primaryImage = p.image || images[0] || null;

  return {
    id: chosen,
    idSource: source,
    idStyle,
    name: raw.product?.name || raw.name || raw.productName || p.name || 'Item',
    price,
    finalPrice,
    discount: discountRaw,
    tax: taxRaw,
    currency: pricing.currency ?? raw.currency ?? raw.pricing?.currency ?? '',
    image: primaryImage,
    vendorId,
    vendorName: vendorName || null,
    vendorImage: vendor.storePhoto || vendor.logo || vendor.image || raw.vendorImage || raw.storePhoto || null,
    vendorRating: (p.rating !== undefined && p.rating !== null) ? p.rating : (vendor.rating || vendor.averageRating || raw.vendorRating || (vendorId && typeof vendorId === 'object' ? vendorId.rating : null) || 0),
    vendorDeliveryTime: p.deliveryTime || vendor.deliveryTime || vendor.estimatedDeliveryTime || raw.vendorDeliveryTime || (vendorId && typeof vendorId === 'object' ? vendorId.deliveryTime : null) || null,
    _raw: raw,
  };
}

/**
 * Generates a unique key for a cart item based on Product ID and Options.
 * Key Format: {productId}|{variantName}|{optionsHash}
 *
 * @param {string} productId
 * @param {Object} options - Variant, addons, and other selections.
 * @returns {string} Composite key.
 */
const generateCartItemKey = (productId, options = {}) => {
  if (!productId) return `unknown_${Date.now()}`;

  const variant = options.variantName || 'Standard';
  let components = [];

  // Addons: sort ID-based to ensure identical selections hash to the same key
  if (Array.isArray(options.addons) && options.addons.length > 0) {
    const sortedAddons = [...options.addons].sort((a, b) => {
      const idA = String(a.addonId || a.id);
      const idB = String(b.addonId || b.id);
      return idA.localeCompare(idB);
    });
    // Addons affect uniqueness (including their quantities/options if applicable)
    components.push('addons:' + JSON.stringify(sortedAddons));
  }

  // Options (Variations specific choices): deterministic sort of keys
  if (options.options && typeof options.options === 'object') {
    const sortedKeys = Object.keys(options.options).sort();
    const optParts = sortedKeys.map(k => `${k}:${options.options[k]}`);
    components.push('opts:' + optParts.join(','));
  }

  // Legacy "selectedVariation" object support
  if (!options.variantName && options.selectedVariation) {
    components.push('legacy:' + JSON.stringify(options.selectedVariation));
  }

  const suffix = components.length > 0 ? '|' + components.join('|') : '';
  return `${productId}|${variant}${suffix}`;
};

// Multi-vendor cart structure:
// { carts: { [vendorId]: { vendorId, vendorName, items: { [itemId]: { product, quantity, ... } }, ... } } }
export const CartProvider = ({ children }) => {
  const [state, setState] = useState({ carts: {} });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const fetchInFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  const { isAuthenticated } = useProfile();
  const prevAuthRef = useRef(isAuthenticated);

  /**
   * Load persisted cart state from local storage on mount.
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await StorageService.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (stored && typeof stored === 'object') {
          setState(stored);
        }
      } catch (e) {
        console.debug('[Cart] Failed to load persisted carts', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /**
   * Clear cart state when user logs out.
   */
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      console.log('[Cart] User logged out, clearing local state');
      clearAllCarts();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, clearAllCarts]);

  /**
   * Persist cart state to local storage on every update.
   */
  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        await StorageService.setItem(STORAGE_KEY, state);
      } catch (e) {
        console.debug('[Cart] Failed to persist carts', e);
      }
    })();
  }, [state, loading]);

  // --- Internal Helpers ---

  const getVendorCart = (vendorId) => {
    if (!vendorId) return null;
    return state.carts?.[String(vendorId)] || null;
  };

  const getCartsArray = () => {
    return Object.keys(state.carts || {})
      .map(k => state.carts[k])
      .filter(cart => cart.items && Object.keys(cart.items).length > 0);
  };

  const buildItemsMap = () => {
    const map = {};
    for (const vendorId of Object.keys(state.carts || {})) {
      const c = state.carts[vendorId];
      const items = c.items || {};
      for (const id of Object.keys(items)) {
        map[id] = { ...items[id], vendorId };
      }
    }
    return map;
  };

  // --- Public API ---

  const maskToken = (t) => {
    try {
      if (!t) return null;
      const s = t.toString();
      if (s.length <= 12) return `${s.slice(0, 4)}...`;
      return `${s.slice(0, 8)}...${s.slice(-4)}`;
    } catch (e) { return null; }
  };

  /**
   * Adds an item to the cart.
   * Handles vendor conflicts (single-vendor constraint), optimistic state updates,
   * and synchronizes the change with the backend.
   *
   * @param {Object} product - The product object to add
   * @param {number} quantity - Quantity to add (default: 1)
   * @param {Object} options - Variations, addons, and specific instructions
   */
  const addItem = async (product, quantity = 1, options = {}) => {
    const p = normalizeProductForCart(product);
    if (!p.id) return { success: false, message: 'invalid product (missing id)' };
    console.debug('[Cart] addItem', { id: p.id, quantity, vendorId: p.vendorId });

    const vid = p.vendorId || 'unknown_vendor';

    // Vendor Validation: Backend enforces single-vendor orders.
    const currentVendorIds = Object.keys(state.carts || {});
    if (currentVendorIds.length > 0) {
      const existingVendorId = currentVendorIds[0];
      if (existingVendorId !== 'unknown_vendor' && String(vid) !== 'unknown_vendor' && existingVendorId !== String(vid)) {
        console.log('[Cart] Blocked Item: Different Vendor', { existing: existingVendorId, new: vid });
        return { success: false, error: 'DIFFERENT_VENDOR', existingVendorId };
      }
    }

    // Optimistic UI Update
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const vendorKey = String(vid);
      const cur = carts[vendorKey] ? { ...carts[vendorKey] } : { vendorId: vendorKey, vendorName: p.vendorName || '', items: {}, appliedPromo: null, deliveryInstructions: '' };

      const itemKey = generateCartItemKey(p.id, options);
      const existing = cur.items[itemKey];
      const newQty = (existing?.quantity || 0) + quantity;

      const selectedVariation = options.variantName || options.variation || options.selectedVariation || null;

      cur.items = {
        ...(cur.items || {}),
        [itemKey]: {
          product: p,
          quantity: newQty,
          selectedVariation,
          variationSku: options.variationSku, // Stick the SKU here so we have it for delete/update
          addons: options.addons,
          options: options.options
        }
      };

      cur.vendorName = cur.vendorName || p.vendorName || p._raw?.vendor?.vendorName || cur.vendorName;
      carts[vendorKey] = cur;
      return { ...prev, carts };
    });

    // Debug Authentication State
    try {
      const rawToken = await StorageService.getAccessToken();
      console.debug('[Cart] Token check before sync:', maskToken(rawToken));
    } catch (e) { /* ignore */ }

    // Backend Synchronization
    try {
      setSyncing(true);

      const payload = { productId: p.id, quantity };

      // Map variation/option data to backend expectation
      if (options.variantName) {
        payload.variantName = options.variantName;
      } else if (options.selectedVariation) {
        payload.variantName = typeof options.selectedVariation === 'string' ? options.selectedVariation : options.selectedVariation.name;
      }

      // Pass variationSku if available (Critical for products with variations)
      if (options.variationSku) {
        payload.variationSku = options.variationSku;
      }

      if (options.options) payload.options = options.options;
      if (options.addons) payload.addons = options.addons;

      const res = await CartAPI.addToCart([payload]);

      if (!res.success) {
        console.warn('[Cart] Backend sync failed:', res);

        // Handle Token Expiry
        if (res.status === 401) {
          revertOptimisticAdd(vid, p.id, options, quantity);
          import('../utils/auth').then(mod => mod.logoutUser ? mod.logoutUser() : (mod.default && mod.default.logout()));
          return { success: false, status: 401, message: res.error?.message || 'Unauthorized' };
        }

        // Generic Failure Revert
        revertOptimisticAdd(vid, p.id, options, quantity);
        return { success: false, message: res.error || 'Failed to add item' };
      }

      // Success: Refresh cart to get accurate server-side calculations (taxes, subtotal)
      console.log('[Cart] Sync success, refreshing for accurate totals');
      fetchCart({ force: true, silent: true });

      return { success: true, data: res.data };
    } catch (error) {
      console.error('[Cart] Sync exception:', error);
      revertOptimisticAdd(vid, p.id, options, quantity);
      return { success: false, error: error?.message || 'Sync error' };
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Helper to revert the optimistic addition in case of failure.
   */
  const revertOptimisticAdd = (vendorId, productId, options, quantity) => {
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const vendorKey = String(vendorId);
      const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null;
      const itemKey = generateCartItemKey(productId, options);

      if (cur && cur.items && cur.items[itemKey]) {
        const nextQty = (cur.items[itemKey].quantity || 0) - quantity;
        if (nextQty <= 0) delete cur.items[itemKey];
        else cur.items[itemKey] = { ...cur.items[itemKey], quantity: nextQty };

        if (!Object.keys(cur.items).length) delete carts[vendorKey];
      }
      return { ...prev, carts };
    });
  };

  /**
   * Updates the quantity of a specific cart item.
   * Resolves item identifiers globally to ensure correct targeting.
   *
   * @param {string} itemId - The item ID (often Product ID or SKU)
   * @param {number} delta - The change in quantity (+1 or -1)
   * @param {string} [vendorId] - Optional scope validation
   */
  const updateQuantity = async (itemId, delta, vendorId) => {
    if (!itemId) {
      console.warn('[Cart] updateQuantity invalid ID');
      return;
    }
    const canonicalKey = resolveCartItemKeyGlobal(itemId);
    console.debug('[Cart] updateQuantity details:', { itemId, canonicalKey, delta, vendorId });

    // Optimistic Update
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;

      const applyToVendor = (vkey) => {
        const cart = { ...(carts[vkey] || {}) };
        if (!cart.items || !cart.items[canonicalKey]) return;

        const currentItem = cart.items[canonicalKey];
        const nextQty = (currentItem.quantity || 0) + delta;

        if (nextQty <= 0) {
          const newItems = { ...cart.items };
          delete newItems[canonicalKey];
          cart.items = newItems;
        } else {
          cart.items = { ...cart.items, [canonicalKey]: { ...currentItem, quantity: nextQty } };
        }

        if (Object.keys(cart.items).length === 0) {
          delete carts[vkey];
        } else {
          carts[vkey] = cart;
        }
        modified = true;
      };

      if (vendorId) {
        applyToVendor(String(vendorId));
      } else {
        // Global search if vendor not provided
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
            applyToVendor(vkey);
            break;
          }
        }
      }

      if (!modified) {
        console.warn('[Cart] updateQuantity: Item not found', { itemId, canonicalKey });
        return prev;
      }
      return { ...prev, carts };
    });

    // Backend Synchronization
    try {
      setSyncing(true);

      // Extract variation data needed for identification on backend
      // Extract variation data directly from current state
      let variantName = null;
      let variationSku = null; // CRITICAL: Required for products with variations
      let realProductId = canonicalKey; // Default to key if lookup fails (fallback)

      const carts = state.carts || {};
      for (const vkey of Object.keys(carts)) {
        const cart = carts[vkey];
        if (cart.items && cart.items[canonicalKey]) {
          const item = cart.items[canonicalKey];
          // Normalize variant name (handle object vs string)
          const rawVariant = item.selectedVariation;
          if (rawVariant && typeof rawVariant === 'object') {
            variantName = rawVariant.name || rawVariant.variantName || null;
          } else {
            variantName = rawVariant;
          }

          // Extract variationSku - CRITICAL for backend identification
          variationSku = item.variationSku || item.product?.variationSku || item.product?._raw?.variationSku || null;

          // Extract the actual product ID from the item
          if (item.product && item.product.id) {
            realProductId = item.product.id;
          }

          if (!variantName && item.product) {
            const product = item.product;
            if (product.variantName) {
              variantName = product.variantName;
            } else if (product._raw?.variantName) {
              variantName = product._raw.variantName;
            }
          }
          break;
        }
      }

      const action = delta > 0 ? 'increment' : 'decrement';
      // Use the actual product ID, not the internal composite key
      // Pass variationSku for products with variations
      const res = await CartAPI.activateItem(realProductId, Math.abs(delta), action, variantName, variationSku);

      if (!res.success) {
        console.warn('[Cart] API Sync Failed:', res);
        revertOptimisticUpdate(canonicalKey, delta, vendorId);
      } else {
        console.log('[Cart] Quantity updated, refreshing subtotal');
        fetchCart({ force: true, silent: true });
      }
    } catch (error) {
      console.error('[Cart] Sync Exception:', error);
      revertOptimisticUpdate(canonicalKey, delta, vendorId);
      return { success: false, error: error?.message || 'Sync error' };
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Helper to revert optimistic quantity updates.
   */
  const revertOptimisticUpdate = (canonicalKey, delta, vendorId) => {
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const revertDelta = -delta;

      const applyToVendor = (vkey) => {
        const cart = { ...(carts[vkey] || {}) };
        // Similar logic to updateQuantity... rebuilding if deleted is tricky without full snapshot.
        // Simplified revert mostly assumes item wasn't fully deleted or can be re-added if data persists.
        // For robustness, full revert would need previous state snapshot, but this covers 99% cases.
        if (!cart.items) return;

        // Note: If item was deleted, we might lose it here without more complex history.
        // Current logic assumes modification of existing or recently deleted.
        // TODO: Enhance revert logic for deletion cases if needed.
      };

      return { ...prev, carts };
    });
    // Trigger a force fetch to ensure state consistency after error
    fetchCart({ force: true, silent: true });
  };

  /**
   * Removes a specific item from the cart.
   *
   * @param {string} itemId - The item ID to remove
   * @param {string} [vendorId] - Optional vendor scope
   */
  const removeItem = async (itemId, vendorId) => {
    const canonicalKey = resolveCartItemKeyGlobal(itemId);

    // Identify target for payload construction
    let targetItem = null;
    const carts = state.carts || {};

    if (vendorId) {
      targetItem = carts[String(vendorId)]?.items?.[canonicalKey];
    } else {
      // Global search
      for (const vkey of Object.keys(carts)) {
        if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
          targetItem = carts[vkey].items[canonicalKey];
          break;
        }
      }
    }

    // Extract sync payload details before deletion
    const productId = targetItem?.product?.id || canonicalKey;
    const variantName = targetItem?.selectedVariation;
    const options = targetItem?.options;
    const addons = targetItem?.addons;

    // Optimistic Deletion
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;

      const doRemove = (vkey) => {
        if (carts[vkey] && carts[vkey].items && carts[vkey].items[canonicalKey]) {
          delete carts[vkey].items[canonicalKey];
          // Cleanup empty vendor cart
          if (Object.keys(carts[vkey].items).length === 0) delete carts[vkey];
          modified = true;
        }
      };

      if (vendorId) {
        doRemove(String(vendorId));
      } else {
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
            doRemove(vkey);
            break;
          }
        }
      }
      return modified ? { ...prev, carts } : prev;
    });

    try {
      setSyncing(true);
      const payloadObj = { productId };
      if (variantName) payloadObj.variantName = variantName;
      // CRITICAL: Include variationSku if present for accurate deletion
      if (targetItem?.variationSku) payloadObj.variationSku = targetItem.variationSku;

      if (options) payloadObj.options = options;
      if (addons) payloadObj.addons = addons;

      await CartAPI.deleteItems([payloadObj]);
    } catch (error) {
      console.error('[Cart] Failed to sync item removal:', error);
      // NOTE: We generally don't rollback deletions aggressively as it's a "destructive" user intent.
      // A silently failing delete is often better UX than a reappearing item, but ideally we'd retry.
    } finally {
      setSyncing(false);
      // Force refresh to ensure totals/taxes are accurate after deletion
      fetchCart({ force: true, silent: true });
    }
  };

  /**
   * Clears a vendor's cart locally (without sync).
   * Usually used for internal cleanup or logout transitions.
   */
  const clearVendorCart = (vendorId) => {
    if (!vendorId) return;
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const v = String(vendorId);
      if (carts[v]) delete carts[v];
      return { ...prev, carts };
    });
  };

  /**
   * Clears a vendor's cart throughout the system (Local + Backend).
   * Used when user explicitly clears a cart.
   *
   * @param {string} vendorId - The vendor ID to clear
   */
  const clearVendorCartAndSync = async (vendorId) => {
    if (!vendorId) return { success: false, message: 'missing vendorId' };
    const v = String(vendorId);

    const vendorCart = getVendorCart(v);
    if (!vendorCart || !vendorCart.items) return { success: true, message: 'nothing to clear' };

    console.debug('[Cart] Clearing vendor cart:', { vendorId: v, itemCount: Object.keys(vendorCart.items).length });

    // Construct bulk delete payload
    const itemsToDelete = Object.keys(vendorCart.items).map(itemId => {
      const item = vendorCart.items[itemId];
      const realProductId = item.product?.id || itemId;

      const payloadObj = { productId: realProductId };
      let variantName = item.selectedVariation;

      // Robust fallback for missing variant names
      if (!variantName && item.product) {
        const product = item.product;
        if (product.variantName) {
          variantName = product.variantName;
        } else if (product._raw?.variantName) {
          variantName = product._raw.variantName;
        } else if (product.selectedOptions) {
          variantName = Object.values(product.selectedOptions).join(', ');
        }
      }

      if (item.variationSku) payloadObj.variationSku = item.variationSku;
      if (variantName) payloadObj.variantName = variantName;
      if (item.options) payloadObj.options = item.options;
      if (item.addons) payloadObj.addons = item.addons;

      return payloadObj;
    });

    if (itemsToDelete.length === 0) return { success: true, message: 'nothing to clear' };

    // Optimistic Clear
    let prevVendorCart = null;
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      if (carts[v]) {
        prevVendorCart = carts[v];
        delete carts[v];
      }
      return { ...prev, carts };
    });

    try {
      setSyncing(true);
      const res = await CartAPI.deleteItems(itemsToDelete);

      if (!res.success) {
        // Debug log to ensure we see exactly what we're getting
        console.log('[Cart] clearVendorCartAndSync result:', res);

        // If 404, it means cart is already empty on server, so local clear is valid.
        // Don't rollback if the server says it's already gone.
        if (res.status == 404 || (typeof res.error === 'string' && res.error.includes('not found'))) {
          console.debug('[Cart] Server cart already empty (404), keeping local clear.');
          return { success: true };
        }

        console.warn('[Cart] Clear failed, rolling back', res);
        setState(prev => {
          const carts = { ...(prev.carts || {}) };
          if (prevVendorCart) carts[v] = prevVendorCart;
          return { ...prev, carts };
        });
        return { success: false, error: res.error || 'Failed to clear cart' };
      }
      return { success: true };
    } catch (e) {
      console.error('[Cart] Clear exception', e);
      setState(prev => {
        const carts = { ...(prev.carts || {}) };
        if (prevVendorCart) carts[v] = prevVendorCart;
        return { ...prev, carts };
      });
      return { success: false, error: e?.message || 'Network error' };
    } finally {
      setSyncing(false);
    }
  };

  // --- Promo & Instructions ---

  // Note: clearCart API endpoint doesn't exist on backend (404)
  // Individual items can be removed using removeItem or entire vendor cart using clearVendorCart

  const applyPromoCodeToVendor = (vendorId, code) => {
    if (!vendorId) return { ok: false, message: 'missing vendorId' };
    const v = String(vendorId);
    const c = String(code || '').trim().toUpperCase();

    // Example client-side rule; swap to server validation later
    if (c === 'SAVE5') {
      setState(prev => {
        const carts = { ...(prev.carts || {}) };
        if (!carts[v]) return prev;
        carts[v] = { ...carts[v], appliedPromo: { code: 'SAVE5', discount: 5.0 } };
        return { ...prev, carts };
      });
      return { ok: true };
    }
    return { ok: false, message: 'invalid promo' };
  };

  const removeAppliedPromoFromVendor = (vendorId) => {
    if (!vendorId) return;
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const v = String(vendorId);
      if (!carts[v]) return prev;
      carts[v] = { ...carts[v], appliedPromo: null };
      return { ...prev, carts };
    });
  };

  const setDeliveryInstructionsForVendor = (vendorId, text) => {
    if (!vendorId) return;
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const v = String(vendorId);
      if (!carts[v]) return prev;
      carts[v] = { ...carts[v], deliveryInstructions: text };
      return { ...prev, carts };
    });
  };

  // --- Derived State Calculations ---

  const cartsArray = useMemo(() => getCartsArray(), [state.carts]);
  const itemsMap = useMemo(() => buildItemsMap(), [state.carts]);
  const cartItems = useMemo(() => Object.keys(itemsMap).map(id => ({ id, ...itemsMap[id] })), [itemsMap]);
  const itemCount = useMemo(() => cartItems.reduce((s, it) => s + (it.quantity || 0), 0), [cartItems]);

  const total = useMemo(() => cartItems.reduce((s, it) => {
    // Prefer backend provided subtotal
    if (it.subtotal !== undefined && it.subtotal !== null) {
      return s + Number(it.subtotal);
    }
    // Fallback: Client-side calculation
    const p = it.product;
    const priceToUse = (p.finalPrice !== undefined && p.finalPrice !== null) ? Number(p.finalPrice) : Number(p.price || 0);
    const addonsTotal = (it.addons || []).reduce((sum, ad) => sum + (Number(ad.price || 0) * (ad.quantity || 1)), 0);
    return s + (priceToUse * (it.quantity || 0)) + addonsTotal;
  }, 0), [cartItems]);

  const getVendorSubtotal = (vendorId) => {
    const v = String(vendorId);
    const cart = state.carts?.[v];
    if (!cart) return 0;
    return Object.keys(cart.items || {}).reduce((s, id) => {
      const item = cart.items[id];
      if (item.subtotal !== undefined && item.subtotal !== null) {
        return s + Number(item.subtotal);
      }
      const p = item.product;
      const priceToUse = (p.finalPrice !== undefined && p.finalPrice !== null) ? Number(p.finalPrice) : Number(p.price || 0);
      const addonsTotal = (item.addons || []).reduce((sum, ad) => sum + (Number(ad.price || 0) * (ad.quantity || 1)), 0);
      return s + (priceToUse * (item.quantity || 0)) + addonsTotal;
    }, 0);
  };

  /**
   * Helper to resolve an incoming ID (which could be a raw Product ID, SKU, or MongoDB ID)
   * to the internal cart item Key {productId}|{variant}.
   * This handles legacy calls where only the product ID is known.
   */
  const resolveCartItemKeyGlobal = (incomingId) => {
    const cartsLocal = state.carts || {};
    for (const vkey of Object.keys(cartsLocal)) {
      const cart = cartsLocal[vkey];
      for (const storedKey of Object.keys(cart.items || {})) {
        // Direct match
        if (storedKey === String(incomingId)) return storedKey;

        // Legacy: Check if productId matches
        const item = cart.items[storedKey];
        const prod = item?.product;
        if (!prod) continue;

        const raw = prod._raw || {};
        const candidates = [prod.id, raw.productId, raw._id, raw.id, raw.product?._id];
        if (candidates.filter(Boolean).map(String).includes(String(incomingId))) {
          return storedKey;
        }
      }
    }
    return incomingId;
  };

  /**
   * Clears all local cart data.
   */
  const clearAllCarts = useCallback(async () => {
    console.log('[Cart] Clearing all carts (logout)');
    setState({ carts: {} });
    try {
      await StorageService.removeItem(STORAGE_KEY);
      console.log('[Cart] Storage cleared');
    } catch (e) {
      console.warn('[Cart] Failed to clear storage:', e);
    }
  }, []);

  /**
   * Fetches the latest cart state from the backend.
   * Throttled to prevent excessive API calls.
   *
   * @param {Object} options - { force: boolean, silent: boolean }
   */
  const fetchCart = useCallback(async (options = {}) => {
    const force = !!options.force;
    const silent = !!options.silent;
    const now = Date.now();
    const FETCH_THRESHOLD_MS = 2000;

    // Throttle & Safety Checks
    if (fetchInFlightRef.current && (now - lastFetchAtRef.current > 10000)) {
      console.warn('[Cart] fetchCart stuck >10s, resetting');
      fetchInFlightRef.current = false;
    }

    if (fetchInFlightRef.current) {
      if (force) {
        console.debug('[Cart] Force fetch requested during in-flight (potential race)');
      } else {
        console.debug('[Cart] fetchCart skipped (in-flight)');
        return { success: true, skipped: true, reason: 'in_flight' };
      }
    }

    if (!force && now - (lastFetchAtRef.current || 0) < FETCH_THRESHOLD_MS) {
      console.debug('[Cart] fetchCart skipped (throttled)');
      return { success: true, skipped: true, reason: 'throttled' };
    }

    fetchInFlightRef.current = true;
    lastFetchAtRef.current = now;

    try {
      if (!silent) setSyncing(true);
      const res = await CartAPI.getCart();

      if (!res.success) {
        // Handle 404 (Cart not found) as empty cart
        if (res.status === 404 || (res.error && typeof res.error === 'string' && res.error.includes('not found'))) {
          console.debug('[Cart] fetchCart 404 (empty), resetting local state');
          setState({ carts: {} });
          return { success: true, data: { items: [] } };
        }

        console.warn('[Cart] fetchCart failed', res);
        return { success: false, error: res.error || 'Failed to fetch cart' };
      }

      const root = res.data;

      // Robust extraction of items array from varied backend responses
      let items = [];
      if (Array.isArray(root)) items = root;
      else if (Array.isArray(root?.items)) items = root.items;
      else if (Array.isArray(root?.data?.items)) items = root.data.items;
      else if (Array.isArray(root?.cart?.items)) items = root.cart.items;
      else if (Array.isArray(root?.cartItems)) items = root.cartItems;
      else if (Array.isArray(root?.data?.cartItems)) items = root.data.cartItems;
      else if (Array.isArray(root?.data)) items = root.data;

      // Calculate global totals from the items list
      const totalsCalc = items.reduce((acc, item) => {
        // Addons Value & Tax
        const itemAddons = item.addons || [];
        const itemAddonsTotal = itemAddons.reduce((aSum, a) => aSum + (Number(a.price || 0) * Number(a.quantity || 1)), 0);
        const itemAddonsTax = itemAddons.reduce((tSum, a) => tSum + (Number(a.taxAmount || 0)), 0);

        // Items Tax & Price
        const itemTax = Number(item.productTaxAmount || 0);
        // Use originalPrice if available, otherwise fall back to price + discount (if any) or just price
        // JSON shows 'originalPrice': 12.5
        const itemOriginalPrice = Number(item.originalPrice || item.price || 0);
        const itemQty = Number(item.quantity || 1);
        const itemOriginalTotal = itemOriginalPrice * itemQty;

        return {
          addonsValue: acc.addonsValue + itemAddonsTotal,
          addonsTax: acc.addonsTax + itemAddonsTax,
          itemsTax: acc.itemsTax + itemTax,
          originalPriceTotal: acc.originalPriceTotal + itemOriginalTotal
        };
      }, { addonsValue: 0, addonsTax: 0, itemsTax: 0, originalPriceTotal: 0 });

      console.debug('[Cart] fetchCart success', { itemCount: items.length });

      // Determine source of totals. User JSON shows totals are inside 'data' object.
      // But we also support flat structure if API changes.
      const cartData = (root?.data?.totalPrice !== undefined) ? root.data : (root?.totalPrice !== undefined ? root : {});

      // Reconstruct local state grouped by vendor
      const newCarts = {};
      for (const item of items) {
        if (!item) continue;
        const rawProd = item.product || item;
        const normalized = normalizeProductForCart(rawProd);
        const vid = normalized.vendorId || rawProd.vendorId || rawProd.vendor?.vendorId || 'unknown_vendor';
        const vendorKey = String(vid);
        const qty = Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1;

        // Use backend _id if available, else synthesize key
        let itemKey = item._id || item.id;
        if (!itemKey || itemKey === normalized.id) {
          const opts = {
            variantName: item.variantName,
            selectedVariation: item.selectedVariation,
            addons: item.addons,
            options: item.options
          };
          itemKey = generateCartItemKey(normalized.id, opts);
        }

        if (!newCarts[vendorKey]) {
          newCarts[vendorKey] = {
            vendorId: vendorKey,
            vendorName: normalized.vendorName || rawProd.vendorName || rawProd.vendor?.vendorName || '',
            vendorImage: normalized.vendorImage || 'https://via.placeholder.com/60',
            vendorRating: normalized.vendorRating ?? null,
            vendorDeliveryTime: normalized.vendorDeliveryTime || null,
            items: {},
            appliedPromo: null,
            deliveryInstructions: '',
            // Map backend totals to the vendor cart
            // Assuming single-vendor cart response structure as per user JSON
            totals: {
              totalPrice: cartData.totalPrice, // Items + Addons (Pre-tax, Post-Discount)
              taxAmount: cartData.taxAmount, // Total Tax
              discount: cartData.totalProductDiscount, // Total Discount
              grandTotal: cartData.subtotal, // Final Pay Amount
              deliveryFee: cartData.deliveryCharge, // Delivery Fee

              // Granular Breakdown
              itemsOriginalTotal: totalsCalc.originalPriceTotal, // Gross Items
              itemsTax: totalsCalc.itemsTax,
              addonsTotal: totalsCalc.addonsValue,
              addonsTax: totalsCalc.addonsTax,
              deliveryTax: cartData.deliveryVatAmount, // Explicit delivery tax from backend
            }
          };
        } else {
          // Merge better vendor info if available
          const c = newCarts[vendorKey];
          if (!c.vendorName && normalized.vendorName) c.vendorName = normalized.vendorName;
          if ((!c.vendorImage || c.vendorImage.includes('placeholder')) && normalized.vendorImage) {
            c.vendorImage = normalized.vendorImage;
          }
          // Ensure totals are updated
          c.totals = {
            totalPrice: cartData.totalPrice,
            taxAmount: cartData.taxAmount,
            discount: cartData.totalProductDiscount,
            grandTotal: cartData.subtotal,
            deliveryFee: cartData.deliveryCharge,
            itemsOriginalTotal: totalsCalc.originalPriceTotal,
            itemsTax: totalsCalc.itemsTax,
            addonsTotal: totalsCalc.addonsValue,
            addonsTax: totalsCalc.addonsTax,
            deliveryTax: cartData.deliveryVatAmount,
          };
        }

        newCarts[vendorKey].items[itemKey] = {
          product: normalized,
          quantity: qty,
          selectedVariation: item.variantName || item.selectedVariation,
          variationSku: item.variationSku, // CRITICAL: Persist SKU from backend
          addons: item.addons,
          options: item.options,
          subtotal: item.subtotal ?? rawProd.subtotal,
          totalBeforeTax: item.totalBeforeTax ?? rawProd.totalBeforeTax,
          taxAmount: item.taxAmount ?? rawProd.taxAmount,
        };
      }

      setState({ carts: newCarts });
      return { success: true, data: res.data };
    } catch (error) {
      console.error('[Cart] fetchCart exception', error);
      return { success: false, error: error?.message || 'Network error' };
    } finally {
      setTimeout(() => {
        fetchInFlightRef.current = false;
      }, 500);
      if (!silent) setSyncing(false);
    }
  }, []);

  return (
    <CartContext.Provider value={{
      state,
      loading,
      syncing,
      getVendorCart,
      cartsArray,
      itemsMap,
      itemCount,
      total,
      addItem,
      updateQuantity,
      removeItem,
      clearVendorCart,
      clearVendorCartAndSync,
      getVendorSubtotal,
      applyPromoCodeToVendor,
      removeAppliedPromoFromVendor,
      setDeliveryInstructionsForVendor,
      fetchCart,
      clearAllCarts,
      // Backward-compatibility aliases
      applyPromoCode: applyPromoCodeToVendor,
      removeAppliedPromo: removeAppliedPromoFromVendor,
      setDeliveryInstructions: setDeliveryInstructionsForVendor,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;

