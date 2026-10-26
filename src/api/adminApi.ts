import type { Product } from "@/lib/mock-data";

import { apiFetch, qs } from "./client";

export type ReviewStatus = "pending" | "approved" | "rejected" | "changes_requested";
export type ReviewAction = "approve" | "reject" | "corrections";

export type AdminArtisan = {
  id: string;
  name: string;
  phone: string;
  location: string;
  craft_type: string;
  experience_years: number;
  verification_status: ReviewStatus;
  verification_feedback: string;
  created_at?: string;
};

export type AdminSummary = {
  artisans: number;
  pendingArtisans: number;
  approvedProducts: number;
  pendingProducts: number;
};

export const adminApi = {
  getSummary: () => apiFetch<AdminSummary>("/admin/summary"),
  getArtisans: (status?: ReviewStatus) =>
    apiFetch<AdminArtisan[]>(`/admin/artisans${qs({ status })}`),
  reviewArtisan: (id: string, action: ReviewAction, feedback = "") =>
    apiFetch<AdminArtisan>(`/admin/artisans/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ action, feedback }),
    }),
  getProducts: (status?: ReviewStatus) => apiFetch<Product[]>(`/admin/products${qs({ status })}`),
  reviewProduct: (id: string, action: ReviewAction, feedback = "") =>
    apiFetch<Product>(`/admin/products/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ action, feedback }),
    }),
  deleteProduct: (id: string) =>
    apiFetch<{ success: boolean; id: string }>(`/admin/products/${id}`, { method: "DELETE" }),
};
