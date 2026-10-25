import type { Product } from "@/lib/mock-data";

import { apiFetch } from "./client";

export type ProductInput = {
  name: string;
  description?: string | null;
  category?: string | null;
  craft?: string | null;
  material?: string | null;
  color?: string | null;
  price: number;
  quantity?: number | null;
  image_url?: string | null;
  status?: string | null;
};

export const productApi = {
  getProducts: () => apiFetch<Product[]>("/products"),

  getProduct: (id: string) => apiFetch<Product>(`/products/${id}`),

  createProduct: (input: ProductInput) =>
    apiFetch<Product>("/products", { method: "POST", body: JSON.stringify(input) }),

  updateProduct: (id: string, patch: Partial<ProductInput>) =>
    apiFetch<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  deleteProduct: (id: string) => apiFetch<{ success: boolean; id: string }>(`/products/${id}`, { method: "DELETE" }),
};