// redux/slices/profileSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  original: null, // API data
  edited: {}, // Editable copy
  isProfileUpdated: false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setOriginalProfile(state, action) {
      state.original = action.payload;
      state.edited = action.payload; // clone initial
      state.isProfileUpdated = false;
    },

    updateField(state, action) {
      const { key, value } = action.payload;
      state.edited[key] = value;

      // detect changes
      state.isProfileUpdated =
        JSON.stringify(state.original) !== JSON.stringify(state.edited);
    },

    resetProfileChanges(state) {
      state.edited = state.original;
      state.isProfileUpdated = false;
    },

    updateProfilePhoto(state, action) {
      state.edited.profilePhoto = action.payload;
      state.isProfileUpdated =
        JSON.stringify(state.original) !== JSON.stringify(state.edited);
    },
  },
});

export const {
  setOriginalProfile,
  updateField,
  resetProfileChanges,
  updateProfilePhoto,
} = profileSlice.actions;

export default profileSlice.reducer;
