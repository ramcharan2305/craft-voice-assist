import { apiFetch, type StoredAuthSession } from "./client";

export type AuthUser = StoredAuthSession["user"];

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<StoredAuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  refresh: (refreshToken: string) =>
    apiFetch<StoredAuthSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  me: () => apiFetch<{ user: AuthUser }>("/auth/me"),
  logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};
