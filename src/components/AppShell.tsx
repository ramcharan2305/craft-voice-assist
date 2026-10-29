import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Home,
  Landmark,
  LineChart,
  LogOut,
  Mic,
  Package,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  User,
} from "lucide-react";

import { BottomNavigation } from "@/components/BottomNavigation";
import { VoiceAssistantSheet } from "@/components/VoiceAssistantSheet";
import { AuthRedirect, useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { uiText } from "@/lib/ui-text";

const MERCHANT_NAV = [
  { to: "/home", label: "navHome", icon: Home },
  { to: "/products", label: "navProducts", icon: Package },
  { to: "/orders", label: "navOrders", icon: ShoppingBag },
  { to: "/sales", label: "navSales", icon: BarChart3 },
  { to: "/buyers", label: "navBuyers", icon: TrendingUp },
  { to: "/schemes", label: "navSchemes", icon: Landmark },
  { to: "/training", label: "navTraining", icon: BookOpen },
  { to: "/market", label: "navMarket", icon: LineChart },
  { to: "/profile", label: "navProfile", icon: User },
  { to: "/help", label: "navHelp", icon: CircleHelp },
] as const;

const BUYER_NAV = [{ to: "/user", label: "navDiscover", icon: ShoppingBag }] as const;
const ADMIN_NAV = [{ to: "/admin", label: "navOverview", icon: ShieldCheck }] as const;

type AppRole = "merchant" | "buyer" | "admin";

export function CraftBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-44 -left-32 size-[36rem] rotate-[16deg] rounded-[3rem] bg-white/40 shadow-2xl shadow-clay/10 ring-1 ring-white/50 backdrop-blur-2xl" />
      <div className="absolute top-[38%] -right-28 size-[30rem] -rotate-12 rounded-[3rem] bg-clay/10 ring-1 ring-white/40 backdrop-blur-xl" />
      <div className="absolute -bottom-24 left-1/4 size-[24rem] rotate-[8deg] rounded-[3rem] bg-sage/10 ring-1 ring-white/40 backdrop-blur-xl" />
    </div>
  );
}

export function AppShell({ children, role = "merchant" }: { children: ReactNode; role?: AppRole }) {
  return (
    <AuthRedirect role={role}>
      <AppShellContent role={role}>{children}</AppShellContent>
    </AuthRedirect>
  );
}

function AppShellContent({ children, role }: { children: ReactNode; role: AppRole }) {
  const { artisan, language, notice, clearNotice, openAssistant } = useStore();
  const { user } = useAuth();
  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[2];
  const languageName = language === "te" ? "తెలుగు" : lang.name;
  const nav = role === "buyer" ? BUYER_NAV : role === "admin" ? ADMIN_NAV : MERCHANT_NAV;
  const roleLabel = uiText(
    language,
    role === "buyer" ? "buyerWorkspace" : role === "admin" ? "adminWorkspace" : "workspace",
  );
  const contentWidth = role === "merchant" ? "max-w-[44rem]" : "max-w-[72rem]";

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
            <Link to="/" className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-clay font-display text-lg font-semibold text-white">
                क
              </span>
              <span>
                <span className="block font-display text-lg font-semibold">H Connect</span>
                <span className="block text-sm text-ink/55">
                  {role === "merchant" ? uiText(language, "assistantBrand") : "H Connect"}
                </span>
              </span>
            </Link>
            <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">
              {roleLabel}
            </p>
            <nav className="mt-3 flex flex-col gap-1.5">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-13 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium text-ink/65 transition-colors hover:bg-white/50"
                  activeProps={{ className: "bg-white/70 text-clay font-semibold" }}
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                  {uiText(language, label)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            {role === "merchant" ? (
              <>
                <button
                  onClick={openAssistant}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-base font-semibold text-white"
                >
                  <Mic className="size-5" /> {uiText(language, "assistantButton")}
                </button>
                <div className="chip flex items-center gap-2 px-3 py-2">
                  <span className="grid size-8 place-items-center rounded-full bg-clay text-xs font-semibold text-white">
                    {lang.short}
                  </span>
                  <span className="text-sm font-medium">{languageName}</span>
                  <Link to="/language" className="ml-auto text-sm font-medium text-clay">
                    {uiText(language, "changeLanguage")}
                  </Link>
                </div>
                <p className="px-1 text-xs text-ink/50">
                  Signed in as {user?.email} · {artisan.name}
                </p>
              </>
            ) : (
              <p className="px-1 text-xs text-ink/50">Signed in as {user?.email}</p>
            )}
            <Link
              to="/logout"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink/10 text-sm font-medium text-ink/65 hover:bg-white/50"
            >
              <LogOut className="size-4" /> {uiText(language, "signOut")}
            </Link>
          </div>
        </aside>

        <main className="relative w-full pb-32 md:pb-10">
          <div className={`mx-auto ${contentWidth} px-5 pt-5 md:px-8 md:pt-8`}>
            <div className="mb-5 flex items-center justify-between md:hidden">
              <span className="text-xs text-ink/55">{user?.email}</span>
              <Link
                to="/logout"
                className="chip flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
              >
                <LogOut className="size-3.5" /> {uiText(language, "signOut")}
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>

      {notice ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-5"
          aria-live="polite"
        >
          <p className="glass-strong px-5 py-3 text-base font-medium text-ink">{notice}</p>
        </div>
      ) : null}
      <BottomNavigation role={role} />
      {role === "merchant" ? <VoiceAssistantSheet /> : null}
    </div>
  );
}
