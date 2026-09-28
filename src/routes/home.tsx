import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MicButton } from "@/components/MicButton";
import { ProductCard } from "@/components/ProductCard";
import { LANGUAGES, rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Your assistant — H Connect" },
      { name: "description", content: "Tap and speak. Your assistant lists products, sets prices and finds buyers." },
      { property: "og:title", content: "Your assistant — H Connect" },
      { property: "og:description", content: "Tap and speak. Your assistant lists products, sets prices and finds buyers." },
    ],
  }),
  component: HomePage,
});

const EXAMPLES = [
  { text: "List my new product", to: "/list" },
  { text: "Show my products", to: "/products" },
  { text: "What should I charge?", to: "/list" },
  { text: "Show my sales", to: "/sales" },
  { text: "Find buyers", to: "/buyers" },
] as const;

function HomePage() {
  const { artisan, language, products, openAssistant, sales } = useStore();
  const navigate = useNavigate();
  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[2];
  const total = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <AppShell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-tight text-balance">Namaste, {artisan.name} 👋</h1>
          <p className="mt-1 text-[15px] text-ink/60">What would you like to do?</p>
        </div>
        <Link to="/language" className="chip flex items-center gap-2 py-1.5 pr-3 pl-2 md:hidden">
          <span className="grid size-7 place-items-center rounded-full bg-clay text-[11px] font-semibold text-white">
            {lang.short}
          </span>
          <span className="text-sm font-medium">{lang.name}</span>
        </Link>
      </header>

      <section className="mt-9 flex flex-col items-center">
        <MicButton onClick={openAssistant} />
        <h2 className="mt-6 text-3xl leading-tight text-balance">Tap and speak</h2>
        <p className="mt-2 max-w-[34ch] text-center text-base text-ink/55">
          Say what you want. Your saree, baskets, or sales — I'll do it for you.
        </p>
      </section>

      <section className="mt-9 flex flex-wrap justify-center gap-2.5">
        {EXAMPLES.map((example) => (
          <button
            key={example.text}
            onClick={() => navigate({ to: example.to })}
            className="chip px-4 py-3 text-[15px] font-medium text-ink"
          >
            {example.text}
          </button>
        ))}
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="glass p-5">
          <p className="text-sm text-ink/55">Money earned</p>
          <p className="mt-1 font-display text-3xl font-semibold text-clay">{rupees(total)}</p>
          <Link to="/sales" className="mt-3 flex items-center gap-1 text-base font-medium text-clay">
            See my business <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-ink/55">Products in the market</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            {products.filter((p) => p.status === "listed").length}
          </p>
          <Link to="/products" className="mt-3 flex items-center gap-1 text-base font-medium text-clay">
            See my products <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Recently added</h2>
          <Link to="/products" className="text-base font-medium text-clay">
            See all
          </Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {products.slice(0, 2).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
