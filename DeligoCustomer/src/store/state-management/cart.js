import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [], // {id, name, price, quantity}
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;

      const existing = state.items.find((x) => x.id === item.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...item, quantity: 1 });
      }
    },

    increaseQty: (state, action) => {
      const id = action.payload;
      const item = state.items.find((x) => x.id === id);
      if (item) item.quantity += 1;
    },

    decreaseQty: (state, action) => {
      const id = action.payload;
      const item = state.items.find((x) => x.id === id);
      if (item && item.quantity > 1) item.quantity -= 1;
    },

    removeFromCart: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((x) => x.id !== id);
    },
  },
});

export const { addToCart, increaseQty, decreaseQty, removeFromCart } =
  cartSlice.actions;

export default cartSlice.reducer;
