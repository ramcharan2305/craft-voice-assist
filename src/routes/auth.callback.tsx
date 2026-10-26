import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { CraftBackdrop } from "@/components/AppShell";
import { useAuth, roleHome } from "@/lib/auth";
import { googleAuthClient } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Completing sign in — H Connect" },
      { name: "description", content: "Completing your secure Google sign-in." },
    ],
  }),
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const { completeGoogleSignIn } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const completeSignIn = async () => {
      const selectedRole = window.sessionStorage.getItem("hconnect.google-role");
      if (selectedRole !== "buyer" && selectedRole !== "merchant") {
        throw new Error("Choose Buyer or Merchant before starting Google sign-in.");
      }
      if (!googleAuthClient) {
        throw new Error("Google sign-in is not configured for this app.");
      }

      const { data, error: sessionError } = await googleAuthClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        const urlError = new URLSearchParams(window.location.search).get("error_description");
        throw new Error(urlError || "Google sign-in did not return a session. Please try again.");
      }

      const user = await completeGoogleSignIn(
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_at ?? null,
        selectedRole,
      );
      window.sessionStorage.removeItem("hconnect.google-role");
      await navigate({ to: roleHome(user.role) });
    };

    void completeSignIn().catch(async (caught: unknown) => {
      window.sessionStorage.removeItem("hconnect.google-role");
      if (googleAuthClient) await googleAuthClient.auth.signOut({ scope: "local" });
      setError(caught instanceof Error ? caught.message : "Unable to complete Google sign-in.");
    });
  }, [completeGoogleSignIn, navigate]);

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <CraftBackdrop />
      <section className="glass-strong relative w-full max-w-md p-7 text-center sm:p-9">
        {error ? (
          <>
            <h1 className="text-3xl">Sign-in could not be completed</h1>
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-clay px-5 font-semibold text-white"
            >
              Return to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-9 animate-spin text-clay" />
            <h1 className="mt-5 text-2xl">Finishing your sign-in…</h1>
            <p className="mt-2 text-sm text-ink/55">Setting up your buyer or merchant workspace.</p>
          </>
        )}
      </section>
    </main>
  );
}
