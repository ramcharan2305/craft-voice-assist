import { apiFetch, type StoredAuthSession } from "./client";

export type AuthUser = StoredAuthSession["user"];
export type AccountRole = "merchant" | "buyer";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<StoredAuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  completeGoogle: (accessToken: string, role: AccountRole) =>
    apiFetch<{ user: AuthUser }>("/auth/google/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ role }),
    }),
  refresh: (refreshToken: string) =>
    apiFetch<StoredAuthSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  me: () => apiFetch<{ user: AuthUser }>("/auth/me"),
  logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};
