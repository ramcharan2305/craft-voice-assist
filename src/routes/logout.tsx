import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { CraftBackdrop } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/logout")({
  head: () => ({
    meta: [
      { title: "Sign out — H Connect" },
      { name: "description", content: "Sign out of your H Connect account." },
    ],
  }),
  component: LogoutPage,
});

function LogoutPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not revoke your session.");
      setSignedOut(true);
      return;
    }
    setSignedOut(true);
    void navigate({ to: "/login" });
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <CraftBackdrop />
      <section className="glass-strong relative w-full max-w-md p-7 text-center sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-clay/12 text-clay">
          <LogOut className="size-6" />
        </span>
        <h1 className="mt-5 text-3xl">{signedOut ? "You’re signed out" : "Sign out of H Connect?"}</h1>
        <p className="mt-2 text-sm text-ink/55">
          {signedOut
            ? "Your session has ended."
            : user
              ? `You’re currently signed in as ${user.email}.`
              : "You are not currently signed in."}
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
            {error} Your browser session was cleared.
          </p>
        ) : null}
        {!signedOut ? (
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={signOut}
              className="min-h-12 rounded-xl bg-clay px-5 font-semibold text-white"
            >
              Sign out
            </button>
            <Link to="/" className="chip flex min-h-12 items-center justify-center font-medium">
              Stay signed in
            </Link>
          </div>
        ) : (
          <Link
            to="/login"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-5 font-semibold text-white"
          >
            <ShieldCheck className="size-4" /> Return to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
