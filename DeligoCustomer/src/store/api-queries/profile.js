import apiSlice from "./api-slice";

const profileApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // === Get book request by ID ===
    getLoginUser: builder.query({
      query: () => ({
        url: `/profile`,
        method: "GET",
      }),
      providesTags: ["PROFILE"],
    }),
    // === Update Profile ===
    updateProfile: builder.mutation({
      query: ({ customerId, imageFile, profileData }) => {
        // profileData is an object containing name, contactNumber, address etc.

        const formData = new FormData();

        // Append image file if provided
        if (imageFile) {
          formData.append("file", {
            uri: imageFile.uri, // e.g., from ImagePicker
            name: imageFile.name || "profile.jpg",
            type: imageFile.type || "image/jpeg",
          });
        }

        // Append other data as JSON string
        formData.append("data", JSON.stringify(profileData));

        return {
          url: `/customers/${customerId}`,
          method: "PATCH",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      },
      invalidatesTags: ["PROFILE"], // optionally refetch profile
    }),
  }),
});

export const { useGetLoginUserQuery, useUpdateProfileMutation } = profileApi;
