import { apiFetch, qs } from "./client";

export type Scheme = {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  benefits: string;
  application_process: string;
  official_url: string;
  is_demo: boolean;
};

export const schemeApi = {
  getSchemes: (query?: string) => apiFetch<Scheme[]>(`/schemes${qs({ q: query })}`),
};