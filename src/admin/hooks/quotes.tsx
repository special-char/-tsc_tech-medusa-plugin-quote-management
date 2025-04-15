import { HttpTypes } from "@medusajs/framework/types";
import { ClientHeaders, FetchError } from "@medusajs/js-sdk";
import {
  AdminQuoteResponse,
  QuoteQueryParams,
  AdminQuotesResponse,
} from "../types";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { sdk } from "../lib/sdk";
import { orderPreviewQueryKey } from "./order-preview";

export const useQuotes = (
  query: QuoteQueryParams,
  options?: UseQueryOptions<
    AdminQuotesResponse,
    FetchError,
    AdminQuotesResponse,
    QueryKey
  >
) => {
  const fetchQuotes = (query: QuoteQueryParams, headers?: ClientHeaders) =>
    sdk.client.fetch<AdminQuotesResponse>(`/admin/quotes`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchQuotes(query)!,
    queryKey: ["quote", "list"],
  });

  return { ...data, ...rest };
};

export const useQuote = (
  id: string,
  query?: QuoteQueryParams,
  options?: UseQueryOptions<
    AdminQuoteResponse,
    FetchError,
    AdminQuoteResponse,
    QueryKey
  >
) => {
  const fetchQuote = (
    id: string,
    query?: QuoteQueryParams,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${id}`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    queryFn: () => fetchQuote(id, query),
    queryKey: ["quote", id],
    ...options,
  });

  return { ...data, ...rest };
};

type UpdateQuoteItemParams = HttpTypes.AdminUpdateOrderEditItem & {
  itemId: string;
  unit_price?: number;
};

export const useUpdateQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    UpdateQuoteItemParams
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, ...payload }: UpdateQuoteItemParams) => {
      return sdk.admin.orderEdit.updateOriginalItem(id, itemId, payload);
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: [orderPreviewQueryKey, id],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useConfirmQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    void
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sdk.admin.orderEdit.request(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: [orderPreviewQueryKey, id],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useSendQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient();

  const sendQuote = async (id: string) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${id}/send`, {
      method: "POST",
    });

  return useMutation({
    mutationFn: () => sendQuote(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: [orderPreviewQueryKey, id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", "list"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRejectQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient();

  const rejectQuote = async (id: string) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${id}/reject`, {
      method: "POST",
    });

  return useMutation({
    mutationFn: () => rejectQuote(id),
    onSuccess: (data: AdminQuoteResponse, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: [orderPreviewQueryKey, id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", "list"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
type UpdateQuoteItemsParams = HttpTypes.AdminUpdateOrderEditItem & {
  itemId: string;
  unit_price?: number;
  id: string;
};
export const useUpdateQuoteItemId = (
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    UpdateQuoteItemsParams
  >
) => {
  return useMutation({
    mutationFn: ({ itemId, id, ...payload }: UpdateQuoteItemsParams) => {
      return sdk.admin.orderEdit.updateOriginalItem(id, itemId, payload);
    },
    onSuccess: (data: any, variables: any, context: any) => {
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCreateQuote = (
  options?: UseMutationOptions<
    AdminQuoteResponse,
    FetchError,
    {
      region_id: string;
      customer_id: string;
      quantity: number;
      variant_id: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  const createQuote = async (data: {
    region_id: string;
    customer_id: string;
    quantity: number;
    variant_id: string;
  }) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes`, {
      method: "POST",
      body: data,
    });

  return useMutation({
    mutationFn: (data: {
      region_id: string;
      customer_id: string;
      quantity: number;
      variant_id: string;
    }) => createQuote(data),
    onSuccess: (data: AdminQuoteResponse, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ["quote", "list"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateQuote = (
  id: string,
  options?: UseMutationOptions<
    AdminQuoteResponse,
    FetchError,
    {
      valid_till: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  const sendQuote = async (
    id: string,
    body: {
      valid_till: string;
    }
  ) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${id}/update`, {
      method: "POST",
      body: body,
    });

  return useMutation({
    mutationFn: (body) => sendQuote(id, body),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: [orderPreviewQueryKey, id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["quote", "list"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
