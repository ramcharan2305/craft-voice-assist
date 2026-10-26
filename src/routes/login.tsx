import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck, ShoppingBag, Store } from "lucide-react";

import type { AccountRole } from "@/api/authApi";
import { CraftBackdrop } from "@/components/AppShell";
import { useAuth, roleHome } from "@/lib/auth";
import { googleAuthClient } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — H Connect" },
      {
        name: "description",
        content: "Sign in to your H Connect merchant, buyer, or admin account.",
      },
    ],
  }),
  component: LoginPage,
});

const DEMO_ACCOUNTS = [
  { role: "Merchant", email: "lakshmi@hconnect.app", icon: Store },
  { role: "Admin", email: "admin@hconnect.app", icon: ShieldCheck },
] as const;

const ACCOUNT_ROLES: Array<{
  role: AccountRole;
  label: string;
  detail: string;
  icon: typeof Store;
}> = [
  {
    role: "buyer",
    label: "Buyer",
    detail: "Discover and request handmade crafts",
    icon: ShoppingBag,
  },
  {
    role: "merchant",
    label: "Merchant",
    detail: "List and manage your handmade products",
    icon: Store,
  },
];

function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleRole, setGoogleRole] = useState<AccountRole | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) void navigate({ to: roleHome(user.role) });
  }, [status, user, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const account = await login(email, password);
      await navigate({ to: roleHome(account.role) });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleRole) {
      setError("Choose whether you are joining as a buyer or merchant.");
      return;
    }
    if (!googleAuthClient) {
      setError(
        "Google sign-in is not configured. Add the Supabase URL and publishable key to the frontend environment.",
      );
      return;
    }

    setError(null);
    setGoogleSubmitting(true);
    window.sessionStorage.setItem("hconnect.google-role", googleRole);
    const { error: oauthError } = await googleAuthClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      window.sessionStorage.removeItem("hconnect.google-role");
      setError(oauthError.message);
      setGoogleSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen px-5 py-8">
      <CraftBackdrop />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
          <section className="hidden md:block">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-clay font-display text-lg font-semibold text-white">
                क
              </span>
              <span className="font-display text-2xl font-semibold">H Connect</span>
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-clay">
              One community, two ways to connect
            </p>
            <h1 className="mt-3 max-w-xl text-5xl leading-tight">
              Your craft. Your market. Your voice.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink/60">
              Sign in to manage your craft business, discover handmade work, or administer the
              marketplace.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map(({ role, icon: Icon }) => (
                <div key={role} className="glass p-4">
                  <Icon className="size-5 text-clay" />
                  <p className="mt-3 font-medium">{role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-strong mx-auto w-full max-w-md p-6 sm:p-8">
            <Link to="/" className="mb-6 flex items-center gap-3 md:hidden">
              <span className="grid size-10 place-items-center rounded-xl bg-clay font-display font-semibold text-white">
                क
              </span>
              <span className="font-display text-xl font-semibold">H Connect</span>
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-clay">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl">Join H Connect</h2>
            <p className="mt-2 text-sm text-ink/55">
              Choose a buyer or merchant account to continue with Google.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ACCOUNT_ROLES.map(({ role, label, detail, icon: Icon }) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={googleRole === role}
                  onClick={() => {
                    setGoogleRole(role);
                    setError(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    googleRole === role
                      ? "border-clay bg-clay/10 ring-2 ring-clay/20"
                      : "border-ink/10 bg-white/45 hover:bg-white/75"
                  }`}
                >
                  <Icon className="size-5 text-clay" />
                  <span className="mt-2 block font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-ink/55">{detail}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={googleSubmitting}
              className="mt-4 flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-white px-5 font-semibold text-ink disabled:opacity-60"
            >
              <span aria-hidden className="font-bold text-lg text-clay">
                G
              </span>
              {googleSubmitting ? "Connecting to Google…" : "Continue with Google"}
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/40">
              <span className="h-px flex-1 bg-ink/10" />
              Existing demo account
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 min-h-12 w-full rounded-xl border border-ink/10 bg-white/65 px-3 text-base outline-none focus:ring-2 focus:ring-clay/35"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <span className="mt-2 flex min-h-12 items-center rounded-xl border border-ink/10 bg-white/65 pr-3 focus-within:ring-2 focus-within:ring-clay/35">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-full min-h-12 w-full bg-transparent px-3 text-base outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-ink/50"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </span>
              </label>
              {error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-clay px-5 font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}{" "}
                {!submitting ? <ArrowRight className="size-4" /> : null}
              </button>
            </form>

            <div className="mt-7 border-t border-ink/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/45">
                Lakshmi merchant and admin · password: hconnect123
              </p>
              <div className="mt-3 space-y-2">
                {DEMO_ACCOUNTS.map(({ role, email: demoEmail, icon: Icon }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setEmail(demoEmail);
                      setPassword("hconnect123");
                      setError(null);
                    }}
                    className="chip flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-white/80"
                  >
                    <Icon className="size-4 text-clay" />
                    <span className="font-medium">{role}</span>
                    <span className="ml-auto text-xs text-ink/50">{demoEmail}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
