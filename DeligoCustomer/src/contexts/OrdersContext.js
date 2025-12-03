import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import StorageService from '../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';

const OrdersContext = createContext(null);
export const useOrders = () => useContext(OrdersContext);

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await StorageService.getAccessToken();
      if (token && typeof token === 'object') {
        token = token.accessToken || token.token || token.value;
      }
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) {
        const rawToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        headers.Authorization = rawToken;
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
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ongoingOrders = useMemo(() =>
    orders.filter(order =>
      ['PENDING', 'ACCEPTED', 'APPROVED', 'CONFIRMED', 'PREPARING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ON_THE_WAY'].includes(order.orderStatus?.toUpperCase())
    ), [orders]
  );

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
    ordersCount: orders.length
  }), [orders, ongoingOrders, pastOrders, loading, error, fetchOrders]);

  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
};
