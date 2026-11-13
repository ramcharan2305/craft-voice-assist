import type { Product } from "@/lib/mock-data";

import { apiFetch, qs } from "./client";
import type { CrawlRun, OpportunityCategory } from "./opportunityApi";

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

export type AdminOpportunity = {
  id: string;
  title: string;
  normalized_title: string;
  category: OpportunityCategory;
  description: string;
  source_name: string;
  source_url: string;
  source_urls: string[];
  provider: string | null;
  location: string;
  content_language: string;
  business_category: string;
  product_category: string;
  opportunity_type: string;
  target_audience: string | null;
  eligibility_requirements: string | null;
  benefits: string | null;
  fees: string | null;
  start_date: string | null;
  application_url: string | null;
  application_procedure: string | null;
  duration: string | null;
  delivery_mode: string | null;
  certification: string | null;
  event_date: string | null;
  venue: string | null;
  accepted_products: string | null;
  buyer_details: string | null;
  experience_min: number | null;
  age_min: number | null;
  age_max: number | null;
  gender_eligibility: string;
  eligibility_text: string;
  deadline: string | null;
  last_checked_at: string;
  last_crawled_at: string;
  last_verified_at: string | null;
  status: "active" | "expired" | "unverified";
  review_status: "pending" | "approved" | "rejected";
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
  getOpportunities: () => apiFetch<AdminOpportunity[]>("/admin/opportunities"),
  getOpportunityCrawlStatus: () => apiFetch<CrawlRun | null>("/admin/opportunities/status"),
  crawlOpportunities: () => apiFetch<CrawlRun>("/admin/opportunities/crawl", { method: "POST" }),
  reviewOpportunity: (id: string, status: "approved" | "rejected") =>
    apiFetch<AdminOpportunity>(`/admin/opportunities/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteOpportunity: (id: string) =>
    apiFetch<{ success: boolean; id: string }>(`/admin/opportunities/${id}`, { method: "DELETE" }),
};
