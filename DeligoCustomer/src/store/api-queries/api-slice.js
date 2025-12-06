import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "../../utils/storage";

// Environment-based API Base URLs
const API_BASE_URLS = {
  development: "http://10.0.2.2:5000",
  staging: "https://deligo-food-delivery-server.vercel.app/",
  production: "https://api.deligo.com",
};

// Current environment - Should be managed by build scripts or CI/CD
const ENVIRONMENT = "development"; // 'development' | 'staging' | 'production'

// API Configuration
export const API_CONFIG = {
  BASE_URL: API_BASE_URLS[ENVIRONMENT],
  API_VERSION: "v1",
  TIMEOUT: 30000, // 30 seconds
};

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`,
  prepareHeaders: async (headers) => {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `${accessToken}`);
    }
    return headers;
  },
});

const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  endpoints: () => ({}),
  tagTypes: ["BOOK_REQUESTS", "PROFILE"],
});

export default apiSlice;
