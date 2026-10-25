import { apiFetch, qs } from "./client";

export type MarketInsight = {
  id: string;
  product_category: string;
  region: string;
  demand: string;
  price_range: string;
  trend: string;
  source: string;
  is_demo: boolean;
};

export type MarketResponse = { isDemo: boolean; note: string; items: MarketInsight[] };

export const marketApi = {
  getInsights: (query?: string) => apiFetch<MarketResponse>(`/market${qs({ q: query })}`),
};