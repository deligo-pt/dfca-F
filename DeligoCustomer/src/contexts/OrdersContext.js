import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  }, [fetchOrders]);

  const ongoingOrders = orders.filter(order => ['PENDING','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','ON_THE_WAY'].includes(order.orderStatus?.toUpperCase()));
  const pastOrders = orders.filter(order => ['DELIVERED','COMPLETED','CANCELLED'].includes(order.orderStatus?.toUpperCase()));

  return (
    <OrdersContext.Provider value={{
      orders,
      ongoingOrders,
      pastOrders,
      loading,
      error,
      fetchOrders,
      ordersCount: orders.length
    }}>
      {children}
    </OrdersContext.Provider>
  );
};

