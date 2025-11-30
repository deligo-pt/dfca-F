import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import StorageService from '../utils/storage';

const STORAGE_KEY = 'cart:v1';

const CartContext = createContext(null);
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

export const CartProvider = ({ children }) => {
  const [state, setState] = useState({
    vendorId: null,
    vendorName: null,
    items: {}, // map of id -> { product, quantity }
    appliedPromo: null,
    deliveryInstructions: '',
  });
  const [loading, setLoading] = useState(true);

  // Load persisted cart
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await StorageService.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (stored && typeof stored === 'object') {
          setState(prev => ({ ...prev, ...stored }));
        }
      } catch (e) {
        console.debug('[Cart] failed to load persisted cart', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist cart on change (debounce not necessary for small app)
  useEffect(() => {
    // don't persist while initial loading
    if (loading) return;
    (async () => {
      try {
        await StorageService.setItem(STORAGE_KEY, state);
      } catch (e) {
        console.debug('[Cart] failed to persist cart', e);
      }
    })();
  }, [state, loading]);

  const getItemQuantity = (id) => {
    return state.items[id]?.quantity || 0;
  };

  const addItem = (product, quantity = 1, options = { replaceIfDifferentVendor: true }) => {
    const p = normalizeProductForCart(product);
    // If cart has items from another vendor, replace cart when adding new vendor item
    if (state.vendorId && p.vendorId && String(state.vendorId) !== String(p.vendorId)) {
      if (options.replaceIfDifferentVendor) {
        // replace entire cart
        const next = {
          vendorId: p.vendorId,
          vendorName: p.vendorName,
          items: { [p.id]: { product: p, quantity } },
          appliedPromo: null,
          deliveryInstructions: '',
        };
        setState(next);
        return;
      }
    }

    setState(prev => {
      const curItems = { ...(prev.items || {}) };
      const existing = curItems[p.id];
      const newQty = (existing?.quantity || 0) + quantity;
      curItems[p.id] = { product: p, quantity: newQty };
      return {
        ...prev,
        vendorId: prev.vendorId || p.vendorId || null,
        vendorName: prev.vendorName || p.vendorName || prev.vendorName || null,
        items: curItems,
      };
    });
  };

  const updateQuantity = (itemId, delta) => {
    setState(prev => {
      const cur = { ...(prev.items || {}) };
      if (!cur[itemId]) return prev;
      const nextQty = cur[itemId].quantity + delta;
      if (nextQty <= 0) {
        delete cur[itemId];
      } else {
        cur[itemId] = { ...cur[itemId], quantity: nextQty };
      }
      // if no items left, clear vendor info and promo
      const hasItems = Object.keys(cur).length > 0;
      return {
        ...prev,
        vendorId: hasItems ? prev.vendorId : null,
        vendorName: hasItems ? prev.vendorName : null,
        appliedPromo: hasItems ? prev.appliedPromo : null,
        items: cur,
      };
    });
  };

  const removeItem = (itemId) => {
    setState(prev => {
      const cur = { ...(prev.items || {}) };
      if (!cur[itemId]) return prev;
      delete cur[itemId];
      const hasItems = Object.keys(cur).length > 0;
      return {
        ...prev,
        vendorId: hasItems ? prev.vendorId : null,
        vendorName: hasItems ? prev.vendorName : null,
        appliedPromo: hasItems ? prev.appliedPromo : null,
        items: cur,
      };
    });
  };

  const clearCart = () => setState({ vendorId: null, vendorName: null, items: {}, appliedPromo: null, deliveryInstructions: '' });

  const applyPromoCode = (code) => {
    if (!code) return { ok: false, message: 'Empty code' };
    const c = String(code).trim().toUpperCase();
    // Simple demo rule - in real app validate against backend
    if (c === 'SAVE5') {
      setState(prev => ({ ...prev, appliedPromo: { code: 'SAVE5', discount: 5.0 } }));
      return { ok: true };
    }
    return { ok: false, message: 'Invalid promo' };
  };

  const removeAppliedPromo = () => {
    setState(prev => ({ ...prev, appliedPromo: null }));
  };

  const setDeliveryInstructions = (text) => setState(prev => ({ ...prev, deliveryInstructions: text }));

  const itemsArray = useMemo(() => Object.keys(state.items || {}).map(id => ({ id, ...state.items[id] })), [state.items]);

  const subtotal = useMemo(() => itemsArray.reduce((s, it) => s + (Number(it.product.price || 0) * Number(it.quantity || 0)), 0), [itemsArray]);

  const deliveryFee = useMemo(() => {
    // Prefer vendor-level fee if provided on the first item
    if (itemsArray.length && itemsArray[0].product && itemsArray[0].product._raw) {
      const vendor = itemsArray[0].product._raw.vendor || {};
      return Number(vendor.deliveryFee ?? vendor.delivery_fee ?? 0) || 0;
    }
    return 0;
  }, [itemsArray]);

  const serviceFee = 1.99;
  const discount = state.appliedPromo?.discount || 0;
  const total = useMemo(() => Math.max(0, subtotal + deliveryFee + serviceFee - discount), [subtotal, deliveryFee, serviceFee, discount]);
  const itemCount = useMemo(() => itemsArray.reduce((s, it) => s + it.quantity, 0), [itemsArray]);

  return (
    <CartContext.Provider value={{
      loading,
      cartState: state,
      cartItems: itemsArray,
      itemsMap: state.items,
      itemCount,
      subtotal,
      deliveryFee,
      serviceFee,
      discount,
      total,
      getItemQuantity,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      removeAppliedPromo,
      applyPromoCode,
      setDeliveryInstructions,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
