import { configureStore } from "@reduxjs/toolkit";
import apiSlice from "./api-queries/api-slice";
import { useDispatch, useSelector } from "react-redux";
import mapReducer from "./state-management/map";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    map: mapReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
