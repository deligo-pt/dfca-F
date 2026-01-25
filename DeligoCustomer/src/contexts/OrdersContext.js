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
  const prevAuthRef = useRef(isAuthenticated);

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
  const fetchOrders = useCallback(async () => {
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
        throw new Error(responseData?.message || 'Failed to fetch orders');
      }

      const ordersData = responseData?.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (e) {
      console.error('[Orders] Fetch error:', e);
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

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
   * Statuses: PENDING, ACCEPTED, APPROVED, CONFIRMED, PREPARING, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, ON_THE_WAY
   */
  const ongoingOrders = useMemo(() =>
    orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'APPROVED', 'CONFIRMED', 'PREPARING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ON_THE_WAY'].includes(order.orderStatus?.toUpperCase())
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
