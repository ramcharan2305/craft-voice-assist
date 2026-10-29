/**
 * Base URL of the H-Connect REST API.
 *
 * In development Vite proxies `/api` to the Express server, so the default
 * relative path is all that is needed.
 */
const configuredApiUrl = (import.meta.env["VITE_API_URL"] as string | undefined)?.trim();
export const API_BASE_URL = configuredApiUrl ? configuredApiUrl.replace(/\/$/, "") : "/api";
export const AUTH_STORAGE_KEY = "hconnect.auth";

export type StoredAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  user: { id: string; email: string; role: "merchant" | "buyer" | "admin"; name: string };
};

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** One place for fetch so no component ever calls the API directly. */
async function requestApi(path: string, init: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] =
      typeof Blob !== "undefined" && init.body instanceof Blob
        ? init.body.type || "application/octet-stream"
        : "application/json";
  }
  if (!headers["Authorization"] && typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const session = stored ? (JSON.parse(stored) as StoredAuthSession) : null;
      if (session?.access_token) headers["Authorization"] = "Bearer " + session.access_token;
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Cannot reach the H-Connect server. Is the backend running?", 0, "OFFLINE");
  }

  if (!response.ok) {
    const text = await response.text();
    const payload = text ? safeJson(text) : null;
    const body = payload as { error?: string; code?: string } | null;
    const message = body?.error || "Something went wrong. Please try again.";
    throw new ApiError(message, response.status, body?.code ?? null);
  }

  return response;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await requestApi(path, init);
  const text = await response.text();
  return (text ? safeJson(text) : null) as T;
}

export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await requestApi(path, init);
  return response.blob();
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== "")
      search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export { qs };
