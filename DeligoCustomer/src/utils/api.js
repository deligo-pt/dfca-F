/**
 * @format
 */

import axios from 'axios';
import { getAccessToken } from './token';
import Config from '../constants/config';

const {BASE_API_URL, API_CONFIG, HTTP_STATUS} = Config;

const customerApi = axios.create({
  baseURL: BASE_API_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // allow cookies to be sent/received (refresh token cookie)
  headers: {
    'Content-Type': 'application/json',
  },
});

customerApi.interceptors.request.use(
  async config => {
    const token = await getAccessToken();
    if (token) {
      // token may already include 'Bearer ' prefix or stored raw; handle both
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

customerApi.interceptors.response.use(
  response => {
    return response.data;
  },
  async error => {
    const originalRequest = error.config;

    if (
      error.response.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      // NOTE: The token refresh logic is commented out.
      // You would typically implement a call to your refresh token endpoint here.
      // const newAccessToken = await AuthService.refreshToken();
      // if (newAccessToken) {
      //   originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      //   return customerApi(originalRequest);
      // } else {
      // If unauthorized, clear stored token and let the app handle redirect to login
      import('./auth').then(mod => mod.default && mod.default.logout());
      // Potentially redirect to login screen
      // }
    }
    return Promise.reject(error.response.data);
  },
);

export {customerApi};
