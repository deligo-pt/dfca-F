import { configureStore } from "@reduxjs/toolkit";
import apiSlice from "./api-queries/api-slice";
import { useDispatch, useSelector } from "react-redux";
import cartReducer from "./state-management/cart";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
