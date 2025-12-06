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
  }),
});

export const { useGetLoginUserQuery } = profileApi;
