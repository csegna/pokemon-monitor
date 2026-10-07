"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./api";
import type { ProductCreateInput, ProductUpdateInput, SettingsUpdateInput, Suggestion } from "./types";

// Polling interval for live-ish status without a websocket/SSE layer yet.
const STATUS_POLL_MS = 10_000;

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    refetchInterval: STATUS_POLL_MS,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: api.listProducts,
    refetchInterval: STATUS_POLL_MS,
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["status"] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (input: ProductCreateInput) => api.createProduct(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProductUpdateInput }) => api.updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: invalidate,
  });
}

export function useRestocks(store?: string) {
  return useQuery({
    queryKey: ["restocks", store ?? "all"],
    queryFn: () => api.listRestocks({ store, limit: 50 }),
  });
}

export function useWeeklyCounts(weeks = 11) {
  return useQuery({
    queryKey: ["weekly-counts", weeks],
    queryFn: () => api.weeklyRestockCounts(weeks),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsUpdateInput) => api.updateSettings(input),
    onSuccess: (settings) => queryClient.setQueryData(["settings"], settings),
  });
}

export function useTestWebhook() {
  return useMutation({ mutationFn: api.testWebhook });
}

export function useMarketHistory(productId: number, weeks = 26) {
  return useQuery({
    queryKey: ["market-history", productId, weeks],
    queryFn: () => api.getMarketHistory(productId, weeks),
  });
}

export function useRefreshMarketPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => api.refreshMarketPrice(productId),
    onSuccess: (_data, productId) => {
      queryClient.invalidateQueries({ queryKey: ["market-history", productId] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Faster polling than status/products - a session can produce a new log
// line every few seconds while automation is actively running.
const CHECKOUT_POLL_MS = 3_000;

export function useCheckoutSessions() {
  return useQuery({
    queryKey: ["checkout-sessions"],
    queryFn: api.listCheckoutSessions,
    refetchInterval: CHECKOUT_POLL_MS,
  });
}

export function useCloseCheckoutSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => api.closeCheckoutSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkout-sessions"] }),
  });
}

export function useSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["suggestions"],
    queryFn: () => api.getSuggestions({ limit: 10 }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useRefreshSuggestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.getSuggestions({ limit: 10, refresh: true }),
    onSuccess: (data) => queryClient.setQueryData(["suggestions"], data),
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tcgplayerProductId: string) => api.dismissSuggestion(tcgplayerProductId),
    onSuccess: (_data, tcgplayerProductId) => {
      queryClient.setQueryData<Suggestion[]>(["suggestions"], (current) =>
        current?.filter((s) => s.tcgplayer_product_id !== tcgplayerProductId)
      );
    },
  });
}
