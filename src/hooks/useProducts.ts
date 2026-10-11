"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductDetail, ProductListItem } from "@/lib/products";

export type ProductFilters = { q: string; manufacturerId: string; source: string; page: number; pageSize: number };
export type ProductPage = { items: ProductListItem[]; total: number; page: number; pageSize: number };

export type ProductInput = {
  name: string;
  manufacturerId: string;
  price: number;
  description: string | null;
  category: string | null;
  sku: string | null;
  datasheetUrl: string | null;
  specs: { label: string; value: string }[];
  active: boolean;
  inStock: boolean;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

export function useProductList(f: ProductFilters) {
  return useQuery({
    queryKey: ["products", "list", f],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(f.page), pageSize: String(f.pageSize) });
      if (f.q) p.set("q", f.q);
      if (f.manufacturerId) p.set("manufacturerId", f.manufacturerId);
      if (f.source) p.set("source", f.source);
      return fetch(`/api/products?${p}`).then(json<ProductPage>);
    },
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ["products", "detail", id], queryFn: () => fetch(`/api/products/${id}`).then(json<ProductDetail>) });
}

function useProductMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }) });
}

export const useCreateProduct = () =>
  useProductMutation((v: ProductInput) => send("/api/products", "POST", v).then(json<ProductDetail>));

/** `patch` es parcial: en importados solo `commissionPct`, `active` e `inStock`. */
export const useUpdateProduct = (id: string) =>
  useProductMutation((patch: Partial<ProductInput> & { commissionPct?: number | null }) =>
    send(`/api/products/${id}`, "PATCH", patch).then(json<ProductDetail>),
  );

export const useDeleteProduct = () => useProductMutation((id: string) => send(`/api/products/${id}`, "DELETE").then(json<{ ok: true }>));
