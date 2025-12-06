import apiSlice from "./api-slice";

const bookRequestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // === Get all book requests with filters ===
    getAllBookRequests: builder.query({
      query: (params) => {
        const query = new URLSearchParams();

        if (params?.search_query) query.append("search_query", params.search_query);
        if (params?.page) query.append("page", params.page);
        if (params?.limit) query.append("limit", params.limit);
        if (params?.sortBy) query.append("sortBy", params.sortBy);
        if (params?.sortOrder) query.append("sortOrder", params.sortOrder);
         
        return {
          url: `/book-request?${query.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["BOOK_REQUESTS"],
    }),

    // === Get book request by ID ===
    getBookRequestById: builder.query({
      query: ({ id }) => ({
        url: `/book-request/${id}`,
        method: "GET",
      }),
      providesTags: ["BOOK_REQUESTS"],
    }),

    // === Get book requests by status ===
    getBookRequestsByStatus: builder.query({
      query: ({ status }) => ({
        url: `/book-request/status/${status}`,
        method: "GET",
      }),
      providesTags: ["BOOK_REQUESTS"],
    }),

    // === Update book request status ===
    updateBookRequestStatus: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/book-request/${id}/status`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["BOOK_REQUESTS"],
    }),

    // === Update book request (e.g. details) ===
    updateBookRequest: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/book-request/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["BOOK_REQUESTS"],
    }),

    // === Reply to customer ===
    replyToBookRequest: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/book-request/${id}/reply`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["BOOK_REQUESTS"],
    }),

    // === Remove a reply ===
    removeBookRequestReply: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/book-request/${id}/reply`,
        method: "DELETE",
        body: payload,
      }),
      invalidatesTags: ["BOOK_REQUESTS"],
    }),

    // === Delete book request ===
    deleteBookRequest: builder.mutation({
      query: ({ id }) => ({
        url: `/book-request/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["BOOK_REQUESTS"],
    }),
  }),
});

export const {
  useGetAllBookRequestsQuery,
  useGetBookRequestByIdQuery,
  useGetBookRequestsByStatusQuery,
  useUpdateBookRequestStatusMutation,
  useUpdateBookRequestMutation,
  useReplyToBookRequestMutation,
  useRemoveBookRequestReplyMutation,
  useDeleteBookRequestMutation,
} = bookRequestApi;
