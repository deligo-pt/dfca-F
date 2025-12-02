import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import StorageService from '../utils/storage';
import CartAPI from '../utils/cartApi';
import { isValidObjectId } from '../utils/objectId';

const STORAGE_KEY = 'cart:v1';

export const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function normalizeProductForCart(p) {
  const raw = p._raw || p;

  // Collect all possible ID candidates
  const candidates = [raw.productId, raw._id, raw.product?._id, p.id, raw.id];

  // IMPORTANT: Prioritize PROD-XXXX format (SKU) as backend expects it
  let chosen = null;
  let source = null;

  // First pass: Look for SKU format (PROD-XXXX)
  for (const c of candidates) {
    if (c && typeof c === 'string' && /^PROD-/i.test(c)) {
      chosen = c;
      source = c;
      console.debug('[cart:id-debug] Found SKU format:', chosen);
      break;
    }
  }

  // Second pass: If no SKU, fall back to any valid ID
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

  return {
    id: chosen,
    idSource: source,
    idStyle: style,
    name: raw.product?.name || raw.name || raw.productName || p.name || 'Item',
    price: Number(raw.pricing?.price ?? raw.price ?? p.price ?? 0) || 0,
    currency: raw.pricing?.currency ?? raw.currency ?? '',
    image: p.image || (Array.isArray(raw.images) && raw.images[0]) || null,
    vendorId: raw.vendor?.vendorId || raw.vendorId || null,
    vendorName: raw.vendor?.vendorName || raw.vendorName || null,
    _raw: raw,
  };
}

// New shape: { carts: { [vendorId]: { vendorId, vendorName, items: { [itemId]: { product, quantity } }, appliedPromo, deliveryInstructions } } }
export const CartProvider = ({ children }) => {
  const [state, setState] = useState({ carts: {} });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
      if (s.length <= 12) return `${s.slice(0,4)}...`;
      return `${s.slice(0,8)}...${s.slice(-4)}`;
    } catch (e) { return null; }
  };

  const addItem = async (product, quantity = 1) => {
    const p = normalizeProductForCart(product);
    if (!p.id) return { success: false, message: 'invalid product (missing id)' };
    console.debug('[cart:id-debug] addItem init', { id: p.id, idSource: p.idSource, idStyle: p.idStyle, quantity, vendorId: p.vendorId });
    const vid = p.vendorId || 'unknown_vendor';

    // Optimistic update
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      const vendorKey = String(vid);
      const cur = carts[vendorKey] ? { ...carts[vendorKey] } : { vendorId: vendorKey, vendorName: p.vendorName || '', items: {}, appliedPromo: null, deliveryInstructions: '' };
      const existing = cur.items[p.id];
      const newQty = (existing?.quantity || 0) + quantity;
      cur.items = { ...(cur.items || {}), [p.id]: { product: p, quantity: newQty } };
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
      const res = await CartAPI.addToCart([{ productId: p.id, quantity }]);
      if (!res.success) {
        console.warn('[cart] addToCart failed response:', res);
        // If unauthorized, revert optimistic update and logout
        if (res.status === 401) {
          // revert
          setState(prev => {
            const carts = { ...(prev.carts || {}) };
            const vendorKey = String(vid);
            const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null;
            if (cur && cur.items && cur.items[p.id]) {
              const nextQty = (cur.items[p.id].quantity || 0) - quantity;
              if (nextQty <= 0) delete cur.items[p.id];
              else cur.items[p.id] = { ...cur.items[p.id], quantity: nextQty };
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
          if (cur && cur.items && cur.items[p.id]) {
            const nextQty = (cur.items[p.id].quantity || 0) - quantity;
            if (nextQty <= 0) delete cur.items[p.id];
            else cur.items[p.id] = { ...cur.items[p.id], quantity: nextQty };
            if (!Object.keys(cur.items).length) delete carts[vendorKey];
          }
          return { ...prev, carts };
        });

        return { success: false, message: res.error || 'Failed to add item' };
      }

      return { success: true, data: res.data };
    } catch (error) {
      console.error('Failed to sync cart with backend:', error);
      // revert optimistic update
      setState(prev => {
        const carts = { ...(prev.carts || {}) };
        const vendorKey = String(vid);
        const cur = carts[vendorKey] ? { ...carts[vendorKey] } : null; // fixed typo (was carts[vendorId])
        if (cur && cur.items && cur.items[p.id]) {
          const nextQty = (cur.items[p.id].quantity || 0) - quantity;
          if (nextQty <= 0) delete cur.items[p.id];
          else cur.items[p.id] = { ...cur.items[p.id], quantity: nextQty };
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
      const action = delta > 0 ? 'increment' : 'decrement';
      const res = await CartAPI.activateItem(canonicalKey, Math.abs(delta), action);

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
      await CartAPI.deleteItems([canonicalKey]);
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

    // Collect item IDs
    const vendorCart = getVendorCart(v);
    const itemIds = vendorCart && vendorCart.items ? Object.keys(vendorCart.items) : [];
    if (itemIds.length === 0) return { success: true, message: 'nothing to clear' };

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
      const res = await CartAPI.deleteItems(itemIds);
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
  const total = useMemo(() => cartItems.reduce((s, it) => s + (Number(it.product.price || 0) * (it.quantity || 0)), 0), [cartItems]);

  // Helper: vendor subtotal
  const getVendorSubtotal = (vendorId) => {
    const v = String(vendorId);
    const cart = state.carts?.[v];
    if (!cart) return 0;
    return Object.keys(cart.items || {}).reduce((s, id) => s + (Number(cart.items[id].product.price || 0) * (cart.items[id].quantity || 0)), 0);
  };

  // Global ID resolution helper (maps any incoming product/item id to stored cart key, preferring SKU)
  const resolveCartItemKeyGlobal = (incomingId) => {
    const cartsLocal = state.carts || {};
    for (const vkey of Object.keys(cartsLocal)) {
      const cart = cartsLocal[vkey];
      for (const storedKey of Object.keys(cart.items || {})) {
        const prod = cart.items[storedKey]?.product;
        if (!prod) continue;
        const raw = prod._raw || {};
        const candidates = [storedKey, prod.id, raw.productId, raw._id, raw.id, raw.product?._id];
        if (candidates.filter(Boolean).map(String).includes(String(incomingId))) {
          return storedKey;
        }
      }
    }
    return incomingId;
  };

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
