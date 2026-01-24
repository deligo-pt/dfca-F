import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import StorageService from '../utils/storage';
import CartAPI from '../utils/cartApi';
import { isValidObjectId } from '../utils/objectId';
import { useProfile } from './ProfileContext';

const STORAGE_KEY = 'cart:v1';

export const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function normalizeProductForCart(p) {
  const raw = p._raw || p;

  // Collect all possible ID candidates
  // Handle populated productId object (raw.productId._id)
  const candidates = [
    raw.productId?._id,
    raw.productId,
    raw._id,
    raw.product?._id,
    p.id,
    raw.id
  ];

  // IMPORTANT: Prioritize MongoDB ID (_id) as requested by user
  let chosen = null;
  let source = null;

  // First pass: Look for Mongo ID format (24 hex chars)
  for (const c of candidates) {
    if (isValidObjectId(c)) {
      chosen = c;
      source = c;
      console.debug('[cart:id-debug] Found Mongo ID format:', chosen);
      break;
    }
  }

  // Second pass: If no Mongo ID, look for SKU format (PROD-XXXX)
  if (!chosen) {
    for (const c of candidates) {
      if (c && typeof c === 'string' && /^PROD-/i.test(c)) {
        chosen = c;
        source = c;
        console.debug('[cart:id-debug] Found SKU format:', chosen);
        break;
      }
    }
  }

  // Third pass: Fall back to any valid ID
  if (!chosen) {
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        chosen = c;
        source = c;
        break;
      }
    }
  }

  if (!chosen) {
    console.warn('[cart:id-debug] normalizeProductForCart no ID found', { rawKeys: Object.keys(raw || {}) });
  }

  const style = isValidObjectId(chosen) ? 'objectId' : (/^PROD-/i.test(chosen || '') ? 'sku' : (chosen ? 'other' : 'none'));
  console.debug('[cart:id-debug] normalizeProductForCart', { candidates, chosen, style });

  // Extract vendor info more robustly
  const vendor = raw.vendor || {};
  let vendorId = vendor.vendorId || raw.vendorId || null;
  let vendorName = vendor.vendorName || raw.vendorName || null;

  // Handle populated vendorId object (User schema usually)
  if (vendorId && typeof vendorId === 'object') {
    // If we don't have a name yet, try to get it from the populated vendorId object
    if (!vendorName) {
      const vName = vendorId.name;
      if (typeof vName === 'string') {
        vendorName = vName;
      } else if (vName && typeof vName === 'object') {
        // Construct from first/last
        const parts = [vName.firstName, vName.lastName].filter(Boolean);
        if (parts.length > 0) vendorName = parts.join(' ');
      } else if (vendorId.vendorName) {
        // Sometimes it might still be a vendor object
        vendorName = vendorId.vendorName;
      }
    }
    // Extract actual ID
    vendorId = vendorId._id || vendorId.id || null;
  }

  // Pricing extraction
  const pricing = raw.pricing || {};
  const price = Number(pricing.price ?? raw.price ?? p.price ?? 0) || 0;
  const discountRaw = pricing.discount ?? raw.discount ?? 0;
  const taxRaw = pricing.tax ?? raw.tax ?? 0;
  const finalPriceRaw = pricing.finalPrice ?? raw.finalPrice;

  // Calculate final price if not explicitly provided, or use provided
  // Note: Backend seems to provide finalPrice. Trust it if present.
  let finalPrice = Number(finalPriceRaw);
  if (!Number.isFinite(finalPrice)) {
    // fallback calculation if needed, roughly: price - discount + tax
    // But usually backend finalPrice is the source of truth
    finalPrice = price;
  }

  // Ensure images array is handled
  const images = Array.isArray(raw.images) ? raw.images : [];
  const primaryImage = p.image || images[0] || null;

  return {
    id: chosen,
    idSource: source,
    idStyle: style,
    name: raw.product?.name || raw.name || raw.productName || p.name || 'Item',
    price: price,
    finalPrice: finalPrice, // NEW: exposed for total calculation
    discount: discountRaw,
    tax: taxRaw,
    currency: pricing.currency ?? raw.currency ?? raw.pricing?.currency ?? '',
    image: primaryImage,
    vendorId,
    vendorName: vendorName || null,
    vendorImage: vendor.storePhoto || vendor.logo || vendor.image || raw.vendorImage || raw.storePhoto || null,
    vendorRating: vendor.rating,
    vendorDeliveryTime: vendor.deliveryTime,
    _raw: raw,
  };
}

// Helper to generate a unique key for cart items based on content
// Format: productId|variantName|optionsHash
const generateCartItemKey = (productId, options = {}) => {
  if (!productId) return `unknown_${Date.now()}`;

  const variant = options.variantName || 'Standard';

  // Create a stable hash of addons/options
  // We need to support both "addons" array and generic "options" object
  let components = [];

  // Addons: sort by ID to ensure order doesn't matter
  if (Array.isArray(options.addons) && options.addons.length > 0) {
    const sortedAddons = [...options.addons].sort((a, b) => {
      const idA = String(a.addonId || a.id);
      const idB = String(b.addonId || b.id);
      return idA.localeCompare(idB);
    });
    // Include quantity in key if it matters? Yes, identical addons are same key.
    components.push('addons:' + JSON.stringify(sortedAddons));
  }

  // Options (Variations): sort keys
  if (options.options && typeof options.options === 'object') {
    const sortedKeys = Object.keys(options.options).sort();
    const optParts = sortedKeys.map(k => `${k}:${options.options[k]}`);
    components.push('opts:' + optParts.join(','));
  }

  // legacy "selectedVariation" support
  if (!options.variantName && options.selectedVariation) {
    components.push('legacy:' + JSON.stringify(options.selectedVariation));
  }

  const suffix = components.length > 0 ? '|' + components.join('|') : '';
  return `${productId}|${variant}${suffix}`;
};

// New shape: { carts: { [vendorId]: { vendorId, vendorName, items: { [itemId]: { product, quantity } }, appliedPromo, deliveryInstructions } } }
export const CartProvider = ({ children }) => {
  const [state, setState] = useState({ carts: {} });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const fetchInFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  const { isAuthenticated } = useProfile();
  const prevAuthRef = useRef(isAuthenticated);

  // Load persisted carts
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
        console.debug('[Cart] failed to load persisted carts', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Clear carts on logout (when isAuthenticated changes from true to false)
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      console.log('[CartContext] User logged out, clearing carts');
      clearAllCarts();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, clearAllCarts]);

  // Persist on change
  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        await StorageService.setItem(STORAGE_KEY, state);
      } catch (e) {
        console.debug('[Cart] failed to persist carts', e);
      }
    })();
  }, [state, loading]);

  // Helpers
  const getVendorCart = (vendorId) => {
    if (!vendorId) return null;
    return state.carts?.[String(vendorId)] || null;
  };

  const getCartsArray = () => Object.keys(state.carts || {}).map(k => state.carts[k]);

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

  // Public API
  const maskToken = (t) => {
    try {
      if (!t) return null;
      const s = t.toString();
      if (s.length <= 12) return `${s.slice(0, 4)}...`;
      return `${s.slice(0, 8)}...${s.slice(-4)}`;
    } catch (e) { return null; }
  };

  const addItem = async (product, quantity = 1, options = {}) => {
    const p = normalizeProductForCart(product);
    if (!p.id) return { success: false, message: 'invalid product (missing id)' };
    console.debug('[cart:id-debug] addItem init', { id: p.id, idSource: p.idSource, idStyle: p.idStyle, quantity, vendorId: p.vendorId, options });
    const vid = p.vendorId || 'unknown_vendor';

    // CHECK FOR DIFFERENT VENDOR
    // Backend only supports single-vendor orders. Prevent mixing.
    const currentVendorIds = Object.keys(state.carts || {});
    if (currentVendorIds.length > 0) {
      const existingVendorId = currentVendorIds[0];
      // Note: both are strings due to keys being strings
      if (existingVendorId !== 'unknown_vendor' && String(vid) !== 'unknown_vendor' && existingVendorId !== String(vid)) {
        console.log('[CartContext] Blocked adding item from different vendor', { existing: existingVendorId, new: vid });
        return { success: false, error: 'DIFFERENT_VENDOR', existingVendorId };
      }
    }

    // Optimistic update
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const vendorKey = String(vid);
      const cur = carts[vendorKey] ? { ...carts[vendorKey] } : { vendorId: vendorKey, vendorName: p.vendorName || '', items: {}, appliedPromo: null, deliveryInstructions: '' };

      const itemKey = generateCartItemKey(p.id, options);
      const existing = cur.items[itemKey];
      const newQty = (existing?.quantity || 0) + quantity;

      // Store selected variation in local state if provided
      const selectedVariation = options.variantName || options.variation || options.selectedVariation || null;

      console.debug('[cart] addItem - storing item:', { key: itemKey, productId: p.id, selectedVariation, options });

      cur.items = {
        ...(cur.items || {}),
        [itemKey]: {
          product: p,
          quantity: newQty,
          selectedVariation,
          addons: options.addons, // Store addons locally too
          options: options.options // Store options locally
        }
      };

      cur.vendorName = cur.vendorName || p.vendorName || p._raw?.vendor?.vendorName || cur.vendorName;
      carts[vendorKey] = cur;
      return { ...prev, carts };
    });

    // Read and log token mask for debugging
    try {
      const rawToken = await StorageService.getAccessToken();
      console.debug('[cart] addItem about to call API; token mask:', maskToken(rawToken));
    } catch (e) {
      console.debug('[cart] addItem token read error', e);
    }

    // Sync with backend - p.id now always contains the correct ID (SKU preferred)
    try {
      setSyncing(true);

      const payload = { productId: p.id, quantity };

      // Pass variantName if present (support both direct prop and nested in options)
      // User schema specifically requested "variantName"
      if (options.variantName) {
        payload.variantName = options.variantName;
      } else if (options.selectedVariation) {
        // Fallback legacy support
        payload.variantName = typeof options.selectedVariation === 'string' ? options.selectedVariation : options.selectedVariation.name;
      }

      // Pass full options object if available (contains detailed selection map)
      if (options.options) {
        payload.options = options.options;
      }

      // Pass addons if available 
      if (options.addons) {
        payload.addons = options.addons;
      }

      const res = await CartAPI.addToCart([payload]);
      if (!res.success) {
        console.warn('[cart] addToCart failed response:', res);
        // If unauthorized, revert optimistic update and logout
        if (res.status === 401) {
          // revert
          setState(prev => {
            const carts = { ...(prev.carts || {}) };
            const vendorKey = String(vid);
            const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null;
            const itemKey = generateCartItemKey(p.id, options);

            if (cur && cur.items && cur.items[itemKey]) {
              const nextQty = (cur.items[itemKey].quantity || 0) - quantity;
              if (nextQty <= 0) delete cur.items[itemKey];
              else cur.items[itemKey] = { ...cur.items[itemKey], quantity: nextQty };
              if (!Object.keys(cur.items).length) delete carts[vendorKey];
            }
            return { ...prev, carts };
          });

          import('../utils/auth').then(mod => mod.logoutUser ? mod.logoutUser() : (mod.default && mod.default.logout()));
          return { success: false, status: 401, message: res.error?.message || 'Unauthorized' };
        }

        // Other server-side errors: revert optimistic update partially
        setState(prev => {
          const carts = { ...(prev.carts || {}) };
          const vendorKey = String(vid);
          const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null;
          const itemKey = generateCartItemKey(p.id, options);

          if (cur && cur.items && cur.items[itemKey]) {
            const nextQty = (cur.items[itemKey].quantity || 0) - quantity;
            if (nextQty <= 0) delete cur.items[itemKey];
            else cur.items[itemKey] = { ...cur.items[itemKey], quantity: nextQty };
            if (!Object.keys(cur.items).length) delete carts[vendorKey];
          }
          return { ...prev, carts };
        });

        return { success: false, message: res.error || 'Failed to add item' };
      }

      // Refresh cart from backend to get accurate subtotal (includes addons, discounts)
      // Immediate call, silent mode to avoid loading flicker
      console.log('[CartContext] addItem success, refreshing cart for accurate subtotal');
      fetchCart({ force: true, silent: true });

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Failed to sync cart with backend:', error);
      // revert optimistic update
      setState(prev => {
        const carts = { ...(prev.carts || {}) };
        const vendorKey = String(vid);
        const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null; // fixed typo (was carts[vendorId])
        const itemKey = generateCartItemKey(p.id, options);

        if (cur && cur.items && cur.items[itemKey]) {
          const nextQty = (cur.items[itemKey].quantity || 0) - quantity;
          if (nextQty <= 0) delete cur.items[itemKey];
          else cur.items[itemKey] = { ...cur.items[itemKey], quantity: nextQty };
          if (!Object.keys(cur.items).length) delete carts[vendorKey];
          else carts[vendorKey] = cur;
        }
        return { ...prev, carts };
      });
      return { success: false, error: error?.message || 'Sync error' };
    } finally {
      setSyncing(false);
    }
  };

  // updateQuantity can accept vendorId; if omitted, it finds the item across carts
  const updateQuantity = async (itemId, delta, vendorId) => {
    if (!itemId) {
      console.warn('[CartContext] updateQuantity called with invalid itemId');
      return;
    }
    const canonicalKey = resolveCartItemKeyGlobal(itemId);

    console.debug('[CartContext] updateQuantity', { itemId, canonicalKey, delta, vendorId });

    // Optimistic local state update using canonicalKey
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;
      const applyToVendor = (vkey) => {
        const cart = { ...(carts[vkey] || {}) };
        if (!cart.items || !cart.items[canonicalKey]) return;

        const currentItem = cart.items[canonicalKey];
        const nextQty = (currentItem.quantity || 0) + delta;

        console.debug('[CartContext] applyToVendor', { vkey, itemId, canonicalKey, currentQty: currentItem.quantity, delta, nextQty });

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
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
            applyToVendor(vkey);
            break;
          }
        }
      }

      if (!modified) {
        console.warn('[CartContext] updateQuantity: item not found after resolution', { incoming: itemId, canonicalKey, vendorId });
        return prev;
      }
      return { ...prev, carts };
    });

    // Backend sync with canonicalKey (prefer SKU key)
    try {
      setSyncing(true);

      // Extract variantName from the cart item
      let variantName = null;
      setState(prev => {
        const carts = prev.carts || {};
        for (const vkey of Object.keys(carts)) {
          const cart = carts[vkey];
          if (cart.items && cart.items[canonicalKey]) {
            const item = cart.items[canonicalKey];
            variantName = item.selectedVariation;

            // Fallback: try to extract from product metadata
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
        return prev; // No state change, just extracting data
      });

      const action = delta > 0 ? 'increment' : 'decrement';
      console.debug('[CartContext] updateQuantity - calling API with:', { canonicalKey, delta: Math.abs(delta), action, variantName });
      const res = await CartAPI.activateItem(canonicalKey, Math.abs(delta), action, variantName);

      if (!res.success) {
        console.warn('[CartContext] updateQuantity API failed', res);
        // Revert optimistic update
        setState(prev => {
          const carts = { ...(prev.carts || {}) };
          const revertDelta = -delta;
          const applyToVendor = (vkey) => {
            const cart = { ...(carts[vkey] || {}) };
            if (!cart.items || !cart.items[canonicalKey]) return;
            const currentItem = cart.items[canonicalKey];
            const revertedQty = (currentItem.quantity || 0) + revertDelta;
            if (revertedQty <= 0) {
              const newItems = { ...cart.items };
              delete newItems[canonicalKey];
              cart.items = newItems;
            } else {
              cart.items = { ...cart.items, [canonicalKey]: { ...currentItem, quantity: revertedQty } };
            }
            if (Object.keys(cart.items).length === 0) {
              delete carts[vkey];
            } else {
              carts[vkey] = cart;
            }
          };
          if (vendorId) {
            applyToVendor(String(vendorId));
          } else {
            for (const vkey of Object.keys(carts)) {
              if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
                applyToVendor(vkey);
                break;
              }
            }
          }
          return { ...prev, carts };
        });
      } else {
        // Success - refresh cart to get updated subtotal from backend
        console.log('[CartContext] updateQuantity success, refreshing cart for accurate subtotal');
        fetchCart({ force: true, silent: true });
      }
    } catch (error) {
      console.error('Failed to sync quantity update with backend:', error);
      // Revert optimistic update on exception
      setState(prev => {
        const carts = { ...(prev.carts || {}) };
        const revertDelta = -delta;
        const applyToVendor = (vkey) => {
          const cart = { ...(carts[vkey] || {}) };
          if (!cart.items || !cart.items[canonicalKey]) return;
          const currentItem = cart.items[canonicalKey];
          const revertedQty = (currentItem.quantity || 0) + revertDelta;
          if (revertedQty <= 0) {
            const newItems = { ...cart.items };
            delete newItems[canonicalKey];
            cart.items = newItems;
          } else {
            cart.items = { ...cart.items, [canonicalKey]: { ...currentItem, quantity: revertedQty } };
          }
          if (Object.keys(cart.items).length === 0) {
            delete carts[vkey];
          } else {
            carts[vkey] = cart;
          }
        };
        if (vendorId) {
          applyToVendor(String(vendorId));
        } else {
          for (const vkey of Object.keys(carts)) {
            if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
              applyToVendor(vkey);
              break;
            }
          }
        }

        return { ...prev, carts };
      });
    } finally {
      setSyncing(false);
    }
  };

  const removeItem = async (itemId, vendorId) => {
    const canonicalKey = resolveCartItemKeyGlobal(itemId);

    // Find the item object to extract details for payload
    let targetItem = null;
    const carts = state.carts || {};

    if (vendorId) {
      targetItem = carts[String(vendorId)]?.items?.[canonicalKey];
    } else {
      for (const vkey of Object.keys(carts)) {
        if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
          targetItem = carts[vkey].items[canonicalKey];
          break;
        }
      }
    }

    // Extract details for payload
    // If targetItem is found, use its real product ID (sku/_id) instead of the composite key
    const productId = targetItem?.product?.id || canonicalKey;
    const variantName = targetItem?.selectedVariation;
    const options = targetItem?.options;
    const addons = targetItem?.addons;

    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;
      if (vendorId) {
        const v = String(vendorId);
        if (carts[v] && carts[v].items && carts[v].items[canonicalKey]) {
          delete carts[v].items[canonicalKey];
          if (Object.keys(carts[v].items).length === 0) delete carts[v];
          modified = true;
        }
      } else {
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[canonicalKey]) {
            delete carts[vkey].items[canonicalKey];
            if (Object.keys(carts[vkey].items).length === 0) delete carts[vkey];
            modified = true;
            break;
          }
        }
      }
      if (!modified) return prev;
      return { ...prev, carts };
    });
    try {
      setSyncing(true);
      // Construct detailed payload
      const payloadObj = { productId };
      if (variantName) payloadObj.variantName = variantName;
      if (options) payloadObj.options = options;
      if (addons) payloadObj.addons = addons;

      const deletePayload = [payloadObj];
      await CartAPI.deleteItems(deletePayload);
    } catch (error) {
      console.error('Failed to sync item removal with backend:', error);
    } finally {
      setSyncing(false);
    }
  };

  const clearVendorCart = (vendorId) => {
    if (!vendorId) return;
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const v = String(vendorId);
      if (carts[v]) delete carts[v];
      return { ...prev, carts };
    });
  };

  // Delete entire vendor cart with backend sync (preferred over global clear)
  const clearVendorCartAndSync = async (vendorId) => {
    if (!vendorId) return { success: false, message: 'missing vendorId' };
    const v = String(vendorId);

    // Collect item IDs and variant info
    const vendorCart = getVendorCart(v);
    if (!vendorCart || !vendorCart.items) return { success: true, message: 'nothing to clear' };

    console.debug('[cart] clearVendorCartAndSync - vendor cart items:', vendorCart.items);

    const itemsToDelete = Object.keys(vendorCart.items).map(itemId => {
      const item = vendorCart.items[itemId];
      const realProductId = item.product?.id || itemId;

      const payloadObj = { productId: realProductId };

      let variantName = item.selectedVariation;

      // If no selectedVariation in local state, try to extract from product metadata
      if (!variantName && item.product) {
        const product = item.product;
        // Check if product has variation data stored
        if (product.variantName) {
          variantName = product.variantName;
        } else if (product._raw?.variantName) {
          variantName = product._raw.variantName;
        } else if (product.selectedOptions) {
          // Try to construct from selected options
          variantName = Object.values(product.selectedOptions).join(', ');
        }
      }

      if (variantName) payloadObj.variantName = variantName;
      if (item.options) payloadObj.options = item.options;
      if (item.addons) payloadObj.addons = item.addons;

      return payloadObj;
    });

    console.debug('[cart] clearVendorCartAndSync - final payload:', itemsToDelete);

    if (itemsToDelete.length === 0) return { success: true, message: 'nothing to clear' };

    // Optimistic: remove vendor cart, keep previous copy for potential rollback
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
        console.warn('[cart] clearVendorCartAndSync failed', res);
        // Rollback
        setState(prev => {
          const carts = { ...(prev.carts || {}) };
          if (prevVendorCart) carts[v] = prevVendorCart;
          return { ...prev, carts };
        });
        return { success: false, error: res.error || 'Failed to clear cart' };
      }
      return { success: true };
    } catch (e) {
      console.error('[cart] clearVendorCartAndSync error', e);
      // Rollback
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

  // Derived values for convenience
  const cartsArray = useMemo(() => getCartsArray(), [state.carts]);
  const itemsMap = useMemo(() => buildItemsMap(), [state.carts]);
  const cartItems = useMemo(() => Object.keys(itemsMap).map(id => ({ id, ...itemsMap[id] })), [itemsMap]);
  const itemCount = useMemo(() => cartItems.reduce((s, it) => s + (it.quantity || 0), 0), [cartItems]);
  const total = useMemo(() => cartItems.reduce((s, it) => {
    // Use backend subtotal if available (includes addons, discounts, taxes)
    if (it.subtotal !== undefined && it.subtotal !== null) {
      return s + Number(it.subtotal);
    }
    // Fallback to local calculation
    const p = it.product;
    const priceToUse = (p.finalPrice !== undefined && p.finalPrice !== null) ? Number(p.finalPrice) : Number(p.price || 0);
    const addonsTotal = (it.addons || []).reduce((sum, ad) => sum + (Number(ad.price || 0) * (ad.quantity || 1)), 0);
    return s + (priceToUse * (it.quantity || 0)) + addonsTotal;
  }, 0), [cartItems]);

  // Helper: vendor subtotal
  const getVendorSubtotal = (vendorId) => {
    const v = String(vendorId);
    const cart = state.carts?.[v];
    if (!cart) return 0;
    return Object.keys(cart.items || {}).reduce((s, id) => {
      const item = cart.items[id];
      // Use backend subtotal if available
      if (item.subtotal !== undefined && item.subtotal !== null) {
        return s + Number(item.subtotal);
      }
      // Fallback to local calculation
      const p = item.product;
      const priceToUse = (p.finalPrice !== undefined && p.finalPrice !== null) ? Number(p.finalPrice) : Number(p.price || 0);
      const addonsTotal = (item.addons || []).reduce((sum, ad) => sum + (Number(ad.price || 0) * (ad.quantity || 1)), 0);
      return s + (priceToUse * (item.quantity || 0)) + addonsTotal;
    }, 0);
  };

  // Global ID resolution helper (maps any incoming product/item id to stored cart key, preferring SKU)
  const resolveCartItemKeyGlobal = (incomingId) => {
    const cartsLocal = state.carts || {};
    for (const vkey of Object.keys(cartsLocal)) {
      const cart = cartsLocal[vkey];
      for (const storedKey of Object.keys(cart.items || {})) {
        // If storedKey IS the incoming ID, match directly
        if (storedKey === String(incomingId)) return storedKey;

        const item = cart.items[storedKey];
        const prod = item?.product;
        if (!prod) continue;

        // Check if incomingId matches the Product ID inside the item
        // This is risky if we have multiple items with same product ID.
        // But some legacy calls might pass productId and expect to find "the item".
        // In that case, returning the first match is arguably correct behavior for legacy support.
        const raw = prod._raw || {};
        const candidates = [prod.id, raw.productId, raw._id, raw.id, raw.product?._id];
        if (candidates.filter(Boolean).map(String).includes(String(incomingId))) {
          return storedKey;
        }
      }
    }
    return incomingId;
  };

  // Clear all carts (for logout)
  const clearAllCarts = useCallback(async () => {
    console.log('[CartContext] Clearing all carts (logout)');
    setState({ carts: {} });
    try {
      await StorageService.removeItem(STORAGE_KEY);
      console.log('[CartContext] Cart storage cleared');
    } catch (e) {
      console.warn('[CartContext] Failed to clear cart storage:', e);
    }
  }, []);

  // Fetch cart from backend API (memoized to avoid changing identity)
  const fetchCart = useCallback(async (options = {}) => {
    const force = !!options.force;
    const silent = !!options.silent;
    const now = Date.now();
    const minIntervalMs = 2000; // throttle window

    // Safety: If in-flight for more than 10 seconds, assume stuck and reset
    if (fetchInFlightRef.current && (now - lastFetchAtRef.current > 10000)) {
      console.warn('[CartContext] fetchCart stuck in-flight for >10s, resetting');
      fetchInFlightRef.current = false;
    }

    if (fetchInFlightRef.current) {
      if (force) {
        console.debug('[CartContext] fetchCart force requested while in-flight, allowing but potential race condition');
        // We proceed, but we don't set inFlight to true again since it's already true.
      } else {
        console.debug('[CartContext] fetchCart skipped (in-flight)');
        return { success: true, skipped: true, reason: 'in_flight' };
      }
    }

    if (!force && now - (lastFetchAtRef.current || 0) < minIntervalMs) {
      console.debug('[CartContext] fetchCart skipped (throttled)');
      return { success: true, skipped: true, reason: 'throttled' };
    }

    fetchInFlightRef.current = true;
    lastFetchAtRef.current = now;

    try {
      if (!silent) setSyncing(true);
      const res = await CartAPI.getCart();

      // If we made a successful fetch, we should update state even if another fetch is starting?
      // Yes, React state updates are queued.

      if (!res.success) {
        console.warn('[CartContext] fetchCart failed', res);
        return { success: false, error: res.error || 'Failed to fetch cart' };
      }

      const root = res.data;
      // ... (rest of parsing logic is fine)

      // Extract items from multiple possible shapes
      let items = [];
      if (Array.isArray(root)) {
        items = root;
      } else if (Array.isArray(root?.items)) {
        items = root.items;
      } else if (Array.isArray(root?.data?.items)) {
        items = root.data.items;
      } else if (Array.isArray(root?.cart?.items)) {
        items = root.cart.items;
      } else if (Array.isArray(root?.cartItems)) {
        items = root.cartItems;
      } else if (Array.isArray(root?.data?.cartItems)) {
        items = root.data.cartItems;
      } else if (Array.isArray(root?.data)) {
        items = root.data;
      }

      console.debug('[CartContext] fetchCart received', { itemCount: items.length });
      if (items.length > 0) {
        console.log('[CartContext] raw item sample:', JSON.stringify(items[0], null, 2));
      }

      // Group items by vendor
      const newCarts = {};
      for (const item of items) {
        if (!item) continue;
        const rawProd = item.product || item;
        const normalized = normalizeProductForCart(rawProd);
        const vid = normalized.vendorId || rawProd.vendorId || rawProd.vendor?.vendorId || 'unknown_vendor';
        const vendorKey = String(vid);
        const qty = Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1;

        // Use backend _id as key if available (standard), else synthesize logic to match optimistic
        // If the backend returns a real cart item ID, use it.
        // If we are just parsing a list of products (unlikely for getCart), we might fall back.
        let itemKey = item._id || item.id;

        // If the ID looks like a product ID (e.g. valid mongo id but matches product.id), we might want to be careful.
        // But usually cart items have their own unique IDs.
        // Fallback: If no unique cart item ID, generate one using the same logic as addItem
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
            vendorRating: normalized.vendorRating || '4.5',
            vendorDeliveryTime: normalized.vendorDeliveryTime || '30-40 min',
            items: {},
            appliedPromo: null,
            deliveryInstructions: ''
          };
        } else {
          // Update vendor details if better info is found in subsequent items
          const c = newCarts[vendorKey];
          if (!c.vendorName && normalized.vendorName) c.vendorName = normalized.vendorName;
          if ((!c.vendorImage || c.vendorImage === 'https://via.placeholder.com/60') && normalized.vendorImage) {
            c.vendorImage = normalized.vendorImage;
          }
          if ((!c.vendorRating || c.vendorRating === '4.5') && normalized.vendorRating) {
            c.vendorRating = normalized.vendorRating;
          }
          if ((!c.vendorDeliveryTime || c.vendorDeliveryTime === '30-40 min') && normalized.vendorDeliveryTime) {
            c.vendorDeliveryTime = normalized.vendorDeliveryTime;
          }
        }

        newCarts[vendorKey].items[itemKey] = {
          product: normalized,
          quantity: qty,
          selectedVariation: item.variantName || item.selectedVariation,
          addons: item.addons,
          options: item.options,
          // Preserve backend calculated totals
          subtotal: item.subtotal ?? rawProd.subtotal,
          totalBeforeTax: item.totalBeforeTax ?? rawProd.totalBeforeTax,
          taxAmount: item.taxAmount ?? rawProd.taxAmount,
        };
      }

      setState(prev => {
        const prevCarts = prev?.carts || {};
        // Simple shallow comparison optimization could be here, but let's trust React for now
        // or keep existing logic if it was working well.
        return { carts: newCarts };
      });
      return { success: true, data: res.data };
    } catch (error) {
      console.error('[CartContext] fetchCart error', error);
      return { success: false, error: error?.message || 'Network error' };
    } finally {
      // Small delay before allowing next fetch to debounce rapid retries
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
      // backward-compat aliases
      applyPromoCode: applyPromoCodeToVendor,
      removeAppliedPromo: removeAppliedPromoFromVendor,
      setDeliveryInstructions: setDeliveryInstructionsForVendor,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
