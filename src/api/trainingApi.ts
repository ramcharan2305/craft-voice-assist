import { apiFetch, qs } from "./client";

export type TrainingResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  url: string;
  is_demo: boolean;
};

export const trainingApi = {
  getResources: (query?: string) => apiFetch<TrainingResource[]>(`/training${qs({ q: query })}`),
};