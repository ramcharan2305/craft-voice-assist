import type { Product } from "@/lib/mock-data";

import { apiFetch, qs } from "./client";

export type BuyerRequestStatus = "new" | "in_progress" | "responded" | "closed";
export type BuyerRequestType = "purchase" | "question" | "service";

export type BuyerRequest = {
  id: string;
  buyer_name: string;
  product_id: string | null;
  product_name: string;
  product_image: string;
  artisan_id: string;
  artisan_name: string;
  merchant_qr_url?: string;
  request_type: BuyerRequestType;
  quantity: number;
  message: string;
  status: BuyerRequestStatus | "completed" | "pending";
  payment_status?: "pending" | "submitted" | "verified" | "rejected";
  payment_utr?: string;
  payment_screenshot?: string;
  amount?: number;
  created_at: string;
};

export type BuyerArtisan = {
  id: string;
  name: string;
  location: string;
  craft_type: string;
};

export const buyerApi = {
  getCatalog: (query?: string) => apiFetch<Product[]>(`/products/catalog${qs({ q: query })}`),
  getRequests: () => apiFetch<BuyerRequest[]>("/buyer/requests"),
  getArtisans: () => apiFetch<BuyerArtisan[]>("/buyer/artisans"),
  purchaseProduct: (input: { product_id: string; quantity: number }) =>
    apiFetch<BuyerRequest>("/buyer/purchases", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  submitPayment: (orderId: string, input: { utr: string; screenshot: string }) =>
    apiFetch<BuyerRequest>(`/buyer/orders/${orderId}/payment`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createRequest: (input: {
    product_id?: string;
    artisan_id?: string;
    request_type: Exclude<BuyerRequestType, "purchase">;
    quantity?: number;
    message?: string;
  }) =>
    apiFetch<BuyerRequest>("/buyer/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
