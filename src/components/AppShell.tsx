import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BarChart3, CircleHelp, Home, Mic, Package, ShoppingBag, User } from "lucide-react";

import { BottomNavigation } from "@/components/BottomNavigation";
import { VoiceAssistantSheet } from "@/components/VoiceAssistantSheet";
import { LANGUAGES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/products", label: "My products", icon: Package },
  { to: "/buyers", label: "Buyers", icon: ShoppingBag },
  { to: "/sales", label: "Sales", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/help", label: "Help", icon: CircleHelp },
] as const;

/** Warm glass backdrop shared by every screen. */
export function CraftBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-44 -left-32 size-[36rem] rotate-[16deg] rounded-[3rem] bg-white/40 shadow-2xl shadow-clay/10 ring-1 ring-white/50 backdrop-blur-2xl" />
      <div className="absolute top-[38%] -right-28 size-[30rem] -rotate-12 rounded-[3rem] bg-clay/10 ring-1 ring-white/40 backdrop-blur-xl" />
      <div className="absolute -bottom-24 left-1/4 size-[24rem] rotate-[8deg] rounded-[3rem] bg-sage/10 ring-1 ring-white/40 backdrop-blur-xl" />
    </div>
  );
}

/** Full app chrome: side navigation on desktop, bottom bar plus floating mic on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  const { artisan, language, notice, clearNotice, openAssistant } = useStore();
  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[2];

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 4000);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  return (
    <div className="min-h-screen selection:bg-clay/20">
      <CraftBackdrop />

      <div className="relative md:flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col justify-between p-6 md:flex">
          <div>
            <Link to="/home" className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-clay font-display text-lg font-semibold text-white">
                क
              </span>
              <span>
                <span className="block font-display text-lg font-semibold">H Connect</span>
                <span className="block text-sm text-ink/55">Your craft assistant</span>
              </span>
            </Link>

            <nav className="mt-8 flex flex-col gap-1.5">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-13 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium text-ink/65 transition-colors hover:bg-white/50"
                  activeProps={{ className: "bg-white/70 text-clay font-semibold" }}
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <button
              onClick={openAssistant}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-base font-semibold text-white"
            >
              <Mic className="size-5" /> Tap and speak
            </button>
            <div className="chip flex items-center gap-2 px-3 py-2">
              <span className="grid size-8 place-items-center rounded-full bg-clay text-xs font-semibold text-white">
                {lang.short}
              </span>
              <span className="text-sm font-medium">{lang.name}</span>
              <Link to="/language" className="ml-auto text-sm font-medium text-clay">
                Change
              </Link>
            </div>
            <p className="px-1 text-xs text-ink/50">Demo mode · sample data for {artisan.name}</p>
          </div>
        </aside>

        <main className="relative w-full pb-32 md:pb-10">
          <div className="mx-auto max-w-[44rem] px-5 pt-8 md:px-8">{children}</div>
        </main>
      </div>

      {notice ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-5" aria-live="polite">
          <p className="glass-strong px-5 py-3 text-base font-medium text-ink">{notice}</p>
        </div>
      ) : null}

      <BottomNavigation />
      <VoiceAssistantSheet />
    </div>
  );
}
