import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import StorageService from '../utils/storage';

const STORAGE_KEY = 'cart:v1';

export const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function normalizeProductForCart(p) {
  const raw = p._raw || p;
  return {
    id: p.id || raw._id || raw.productId || raw.id,
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
  const addItem = (product, quantity = 1, options = { replaceExisting: false }) => {
    const p = normalizeProductForCart(product);
    if (!p.id) return;
    const vid = p.vendorId || 'unknown_vendor';
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
  };

  // updateQuantity can accept vendorId; if omitted, it finds the item across carts
  const updateQuantity = (itemId, delta, vendorId) => {
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;
      const applyToVendor = (vkey) => {
        const cart = carts[vkey];
        if (!cart || !cart.items || !cart.items[itemId]) return;
        const nextQty = cart.items[itemId].quantity + delta;
        if (nextQty <= 0) {
          delete cart.items[itemId];
        } else {
          cart.items[itemId] = { ...cart.items[itemId], quantity: nextQty };
        }
        // clear vendor meta if no items
        if (Object.keys(cart.items).length === 0) {
          delete carts[vkey];
        } else {
          carts[vkey] = cart;
        }
        modified = true;
      };

      if (vendorId) {
        const vkey = String(vendorId);
        applyToVendor(vkey);
      } else {
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[itemId]) {
            applyToVendor(vkey);
            break;
          }
        }
      }

      if (!modified) return prev;
      return { ...prev, carts };
    });
  };

  const removeItem = (itemId, vendorId) => {
    setState(prev => {
      const carts = { ...(prev.carts || {}) };
      let modified = false;
      if (vendorId) {
        const v = String(vendorId);
        if (carts[v] && carts[v].items && carts[v].items[itemId]) {
          delete carts[v].items[itemId];
          if (Object.keys(carts[v].items).length === 0) delete carts[v];
          modified = true;
        }
      } else {
        for (const vkey of Object.keys(carts)) {
          if (carts[vkey].items && carts[vkey].items[itemId]) {
            delete carts[vkey].items[itemId];
            if (Object.keys(carts[vkey].items).length === 0) delete carts[vkey];
            modified = true;
            break;
          }
        }
      }
      if (!modified) return prev;
      return { ...prev, carts };
    });
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

  const clearCart = () => {
    setState({ carts: {} });
  };

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

  const total = useMemo(() => {
    return cartItems.reduce((s, it) => s + (Number(it.product.price || 0) * (it.quantity || 0)), 0);
  }, [cartItems]);

  // Helper: vendor subtotal
  const getVendorSubtotal = (vendorId) => {
    const v = String(vendorId);
    const cart = state.carts?.[v];
    if (!cart) return 0;
    return Object.keys(cart.items || {}).reduce((s, id) => s + (Number(cart.items[id].product.price || 0) * (cart.items[id].quantity || 0)), 0);
  };

  return (
    <CartContext.Provider value={{
      loading,
      state,
      carts: state.carts,
      cartsArray,
      cartItems,
      itemsMap,
      itemCount,
      total,
      getVendorCart,
      getVendorSubtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearVendorCart,
      clearCart,
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
