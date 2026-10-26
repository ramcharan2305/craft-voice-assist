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
  request_type: BuyerRequestType;
  quantity: number;
  message: string;
  status: BuyerRequestStatus;
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
  createRequest: (input: {
    product_id?: string;
    artisan_id?: string;
    request_type: BuyerRequestType;
    quantity?: number;
    message?: string;
  }) =>
    apiFetch<BuyerRequest>("/buyer/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
