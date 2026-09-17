import { Link } from "@tanstack/react-router";
import { BarChart3, Home, Mic, Package, ShoppingBag, User } from "lucide-react";

import { useStore } from "@/lib/store";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/products", label: "Products", icon: Package },
  { to: "/buyers", label: "Buyers", icon: ShoppingBag },
  { to: "/sales", label: "Sales", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNavigation() {
  const { openAssistant } = useStore();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="mx-auto max-w-[44rem] px-5 pb-5">
        <nav className="glass-strong pointer-events-auto flex items-center justify-around px-2 py-2">
          {ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium text-ink/55"
              activeProps={{ className: "text-clay font-semibold bg-clay/10" }}
            >
              <Icon className="size-6" strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <button
        onClick={openAssistant}
        aria-label="Ask the assistant"
        className="pointer-events-auto absolute -top-7 left-1/2 grid size-16 -translate-x-1/2 place-items-center rounded-full bg-clay text-white shadow-xl shadow-clay/40 ring-4 ring-paper transition-transform active:scale-95"
      >
        <Mic className="size-7" strokeWidth={1.8} />
      </button>
    </div>
  );
}
