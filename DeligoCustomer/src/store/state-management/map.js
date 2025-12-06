import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Boolean / State defaults
  isMapFullScreen: false,
  isLoadingLocation: false,
  locationPermission: true,

  // Default map region (Tejgaon, Dhaka)
  mapRegion: {
    latitude: 23.7648,
    longitude: 90.4078,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  },

  // Contact address from API (will be updated when API returns)
  contactInfo: {
    contactNumber: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      latitude: null,
      longitude: null,
      geoAccuracy: null,
    },
  },
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    // Toggle fullscreen mode
    setMapFullScreen: (state, action) => {
      state.isMapFullScreen = action.payload;
    },

    // Loading current location
    setLoadingLocation: (state, action) => {
      state.isLoadingLocation = action.payload;
    },

    // OS Location Permission
    setLocationPermission: (state, action) => {
      state.locationPermission = action.payload;
    },

    // Update map region manually (zoom/move)
    setMapRegion: (state, action) => {
      state.mapRegion = action.payload;
    },

    // Set map location from API contact address
    setContactLocation: (state, action) => {
      const data = action.payload; // API response

      state.contactInfo = data;

      // Update map region to API coordinates
      if (data?.address?.latitude && data?.address?.longitude) {
        state.mapRegion = {
          latitude: data.address.latitude,
          longitude: data.address.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      }
    },

    setConfirmedMapRegion: (state, action) => {
      state.confirmedMapRegion = action.payload; // ← This will be the final saved one
      state.mapRegion = action.payload; // Also update current view
    },
  },
});

export const {
  setMapFullScreen,
  setLoadingLocation,
  setLocationPermission,
  setMapRegion,
  setContactLocation,
} = mapSlice.actions;

export default mapSlice.reducer;
