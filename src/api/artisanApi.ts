import { apiFetch } from "./client";

export type ArtisanProfile = {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
  craft_type: string;
  experience_years: number;
  verification_status?: "pending" | "approved" | "rejected" | "changes_requested";
  verification_feedback?: string;
  is_demo: boolean;
};

export type ArtisanProfileInput = Partial<Omit<ArtisanProfile, "id" | "is_demo">>;

export const artisanApi = {
  getProfile: () => apiFetch<ArtisanProfile>("/artisan/profile"),
  updateProfile: (patch: ArtisanProfileInput) =>
    apiFetch<ArtisanProfile>("/artisan/profile", { method: "PUT", body: JSON.stringify(patch) }),
};

export const dashboardApi = {
  getSummary: () =>
    apiFetch<{
      totalProducts: number;
      listedProducts: number;
      totalOrders: number;
      pendingOrders: number;
      totalSales: number;
      unitsSold: number;
      stockValue: number;
    }>("/dashboard"),
};