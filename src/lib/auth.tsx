import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { authApi, type AuthUser } from "@/api/authApi";
import { ApiError, AUTH_STORAGE_KEY, type StoredAuthSession } from "@/api/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: StoredAuthSession | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSessionState] = useState<StoredAuthSession | null>(null);

  const saveSession = useCallback((next: StoredAuthSession | null) => {
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setSessionState(next);
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      let saved: StoredAuthSession | null = null;
      try {
        const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
        saved = raw ? (JSON.parse(raw) as StoredAuthSession) : null;
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }

      if (!saved) {
        if (active) setStatus("unauthenticated");
        return;
      }

      try {
        const next =
          saved.expires_at && saved.expires_at * 1000 <= Date.now() + 60_000
            ? await authApi.refresh(saved.refresh_token)
            : { ...saved, user: (await authApi.me()).user };
        if (active) {
          saveSession(next);
          setStatus("authenticated");
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          saveSession(null);
          setStatus("unauthenticated");
          return;
        }
        saveSession(saved);
        setStatus("authenticated");
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [saveSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await authApi.login(email, password);
      saveSession(next);
      setStatus("authenticated");
      return next.user;
    },
    [saveSession],
  );

  const logout = useCallback(async () => {
    let logoutError: unknown;
    try {
      if (session?.access_token) await authApi.logout();
    } catch (error) {
      if (!(error instanceof ApiError && [401, 403].includes(error.status))) logoutError = error;
    } finally {
      saveSession(null);
      setStatus("unauthenticated");
    }
    if (logoutError) throw logoutError;
  }, [saveSession, session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user: session?.user ?? null, login, logout }),
    [status, session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}

export function AuthRedirect({ role, children }: { role: AuthUser["role"]; children: ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      void navigate({ to: "/login" });
      return;
    }
    if (user && user.role !== role) void navigate({ to: roleHome(user.role) });
  }, [status, user, role, navigate]);

  if (status !== "authenticated" || user?.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <p className="glass px-5 py-4 text-base text-ink/65" aria-live="polite">
          Checking your account…
        </p>
      </div>
    );
  }
  return children;
}

export function roleHome(role: AuthUser["role"]) {
  if (role === "admin") return "/admin" as const;
  if (role === "buyer") return "/user" as const;
  return "/home" as const;
}
