/**
 * OrdersContext Provider
 *
 * Manages the state of user orders, including fetching, caching, and categorizing
 * orders into ongoing and past lists. Handles authentication state changes to ensure
 * data security.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import StorageService from '../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import { useProfile } from './ProfileContext';
import { useSocket } from './SocketContext';

const OrdersContext = createContext(null);

/**
 * Hook to access the OrdersContext.
 * @returns {Object} The orders context value.
 */
export const useOrders = () => useContext(OrdersContext);

/**
 * OrdersProvider Component
 * 
 * Provides order state and methods to the application.
 * Automatically fetches orders when the user is authenticated.
 */
export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isAuthenticated } = useProfile();
  const { socket, joinRoom, isConnected } = useSocket();
  const prevAuthRef = useRef(isAuthenticated);
  const isFetchingRef = useRef(false);
  const lastFetchedRef = useRef(0);
  const FETCH_THRESHOLD_MS = 10000; // 10 seconds

  /**
   * Clears the current order list and error state.
   * Typically used on logout.
   */
  const clearOrders = useCallback(() => {
    setOrders([]);
    setError(null);
  }, []);

  /**
   * Fetches the list of orders from the backend API.
   * Handles authentication headers and error states.
   */
  /**
   * Fetches the list of orders from the backend API.
   * Handles authentication headers and error states.
   * @param {boolean} force - If true, bypasses the throttle.
   */
  const fetchOrders = useCallback(async (force = false) => {
    if (!isAuthenticated) return;

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.debug('[OrdersContext] Fetch already in progress, skipping.');
      return;
    }

    // Rate Limiting: Skip if fetched recently (unless forced)
    const now = Date.now();
    if (!force && (now - lastFetchedRef.current < FETCH_THRESHOLD_MS)) {
      console.debug(`[OrdersContext] Fetch skipped (throttled). Last fetched: ${now - lastFetchedRef.current}ms ago`);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      let token = await StorageService.getAccessToken();
      // Ensure we have a raw string token
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (token) {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.Authorization = authHeader;
      }

      const url = `${BASE_API_URL}${API_ENDPOINTS.ORDERS.LIST}`;
      const response = await fetch(url, { method: 'GET', headers });
      const responseData = await response.json();

      if (!response.ok) {
        // Handle 429 specifically if needed, otherwise throw
        if (response.status === 429) {
          console.warn('[OrdersContext] Rate limited (429).');
          setError('Too many requests. Please wait a moment.');
          return;
        }
        throw new Error(responseData?.message || 'Failed to fetch orders');
      }

      const ordersData = responseData?.data || [];
      const rawOrders = Array.isArray(ordersData) ? ordersData : [];

      // Normalize orders to ensure consistent structure (ids as strings, etc.)
      const newOrders = rawOrders.map(order => {
        // Handle vendorId
        let normalizedVendorId = order.vendorId;
        let vendorName = order.vendorName;
        if (typeof order.vendorId === 'object' && order.vendorId) {
          normalizedVendorId = order.vendorId._id || order.vendorId;
          // Extract vendor name if missing
          if (!vendorName) {
            const v = order.vendorId;
            if (v.name && typeof v.name === 'object') {
              vendorName = `${v.name.firstName || ''} ${v.name.lastName || ''}`.trim();
            } else {
              vendorName = v.businessName || v.businessDetails?.businessName || v.name || v.vendorName || 'Vendor';
            }
          }
        }

        // Handle items
        const normalizedItems = (order.items || []).map(item => {
          let productName = item.name;
          let productId = item.productId;
          if (typeof item.productId === 'object' && item.productId) {
            productName = item.productId.name || item.name || 'Product';
            productId = item.productId._id;
          }
          return { ...item, name: productName, productId };
        });

        return {
          ...order,
          vendorId: normalizedVendorId,
          vendorName: vendorName || order.vendorName,
          items: normalizedItems
        };
      });

      setOrders(newOrders);
      lastFetchedRef.current = Date.now();
    } catch (e) {
      console.error('[Orders] Fetch error:', e);
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!isConnected || !socket) return;

    // Join tracking room for each ongoing order
    const currentOngoingOrders = orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'APPROVED', 'CONFIRMED', 'PREPARING', 'AWAITING_PARTNER', 'DISPATCHING', 'ASSIGNED', 'REASSIGNMENT_NEEDED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'ARRIVED_AT_PICKUP', 'ARRIVED_AT_DELIVERY'].includes(order.orderStatus?.toUpperCase())
    );

    currentOngoingOrders.forEach(order => {
      if (order._id || order.id) {
        joinRoom('join-order-tracking', { orderId: order._id || order.id });
      }
    });

    const handleOrderUpdate = (data) => {
      console.log('[OrdersContext] 📦 Received real-time update:', data);

      const updatedOrderId = data._id || data.id || data.orderId;
      if (!updatedOrderId) return;

      setOrders(prevOrders => {
        const orderExists = prevOrders.find(o => (o._id || o.id) === updatedOrderId);

        if (orderExists) {
          return prevOrders.map(o => {
            if ((o._id || o.id) === updatedOrderId) {
              // Merge updates. If data has status, update orderStatus too.
              const updates = { ...data };
              if (data.status && !data.orderStatus) updates.orderStatus = data.status;

              return { ...o, ...updates };
            }
            return o;
          });
        }
        return prevOrders;
      });
    };

    socket.on('order-status-update', handleOrderUpdate);
    socket.on('order_updated', handleOrderUpdate);

    return () => {
      socket.off('order-status-update', handleOrderUpdate);
      socket.off('order_updated', handleOrderUpdate);
    };
  }, [isConnected, socket, orders, joinRoom]);

  // Fetch orders on mount or when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [fetchOrders, isAuthenticated]);

  // Handle clearing orders on logout
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      console.log('[Orders] User logged out, clearing local order data');
      clearOrders();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, clearOrders]);

  /**
   * Derived state: Orders currently in progress.
   * Statuses: PENDING, ACCEPTED, APPROVED, CONFIRMED, PREPARING, AWAITING_PARTNER, DISPATCHING, ASSIGNED, REASSIGNMENT_NEEDED, PICKED_UP, OUT_FOR_DELIVERY, ON_THE_WAY, ARRIVED_AT_PICKUP, ARRIVED_AT_DELIVERY
   */
  const ongoingOrders = useMemo(() =>
    orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'APPROVED', 'CONFIRMED', 'PREPARING', 'AWAITING_PARTNER', 'DISPATCHING', 'ASSIGNED', 'REASSIGNMENT_NEEDED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'ARRIVED_AT_PICKUP', 'ARRIVED_AT_DELIVERY'].includes(order.orderStatus?.toUpperCase())
    ), [orders]
  );

  /**
   * Derived state: Completed, cancelled, or rejected orders.
   * Statuses: DELIVERED, COMPLETED, CANCELLED, CANCELED, REJECTED
   */
  const pastOrders = useMemo(() =>
    orders.filter(order =>
      ['DELIVERED', 'COMPLETED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(order.orderStatus?.toUpperCase())
    ), [orders]
  );

  const contextValue = useMemo(() => ({
    orders,
    ongoingOrders,
    pastOrders,
    loading,
    error,
    fetchOrders,
    clearOrders,
    ordersCount: orders.length
  }), [orders, ongoingOrders, pastOrders, loading, error, fetchOrders, clearOrders]);

  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
};
