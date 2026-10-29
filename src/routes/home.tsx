import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MicButton } from "@/components/MicButton";
import { ProductCard } from "@/components/ProductCard";
import { LANGUAGES, rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { uiText } from "@/lib/ui-text";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Your assistant — H Connect" },
      {
        name: "description",
        content: "Tap and speak. Your assistant lists products, sets prices and finds buyers.",
      },
      { property: "og:title", content: "Your assistant — H Connect" },
      {
        property: "og:description",
        content: "Tap and speak. Your assistant lists products, sets prices and finds buyers.",
      },
    ],
  }),
  component: HomePage,
});

type Example = { text: string; to: "/list" | "/buyers" | "/products" | "/sales"; command?: string };

const EXAMPLES: ReadonlyArray<Example> = [
  { text: "List my new product", to: "/list" },
  { text: "Show my products", to: "/products", command: "Show my products" },
  { text: "What should I charge?", to: "/list", command: "What should I charge?" },
  { text: "Show my sales", to: "/sales", command: "Show my sales" },
  { text: "Find buyers", to: "/buyers" },
];

const TELUGU_EXAMPLES: ReadonlyArray<Example> = [
  { text: "నా కొత్త చీరను జాబితాలో చేర్చు", to: "/list" },
  { text: "నా ఉత్పత్తులను చూపించు", to: "/products", command: "నా ఉత్పత్తులను చూపించు" },
  { text: "నేను ఎంత ధర పెట్టాలి?", to: "/list", command: "నేను ఎంత ధర పెట్టాలి?" },
  { text: "నా అమ్మకాల వివరాలు చూపించు", to: "/sales", command: "నా అమ్మకాల వివరాలు చూపించు" },
  { text: "కొనుగోలుదారులను కనుగొనండి", to: "/buyers" },
];

function HomePage() {
  const {
    artisan,
    language,
    products,
    openAssistant,
    openAssistantWith,
    sales,
    dashboard,
    dashboardStatus,
    productsStatus,
    productsError,
  } = useStore();
  const navigate = useNavigate();
  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[2];
  const examples = language === "te" ? TELUGU_EXAMPLES : EXAMPLES;
  const total =
    dashboardStatus === "ready"
      ? dashboard.totalSales
      : sales.reduce((sum, s) => sum + s.amount, 0);
  const listed =
    dashboardStatus === "ready"
      ? dashboard.listedProducts
      : products.filter((p) => p.status === "listed").length;

  return (
    <AppShell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-tight text-balance">
            {uiText(language, "homeGreeting")}, {artisan.name} 👋
          </h1>
          <p className="mt-1 text-[15px] text-ink/60">{uiText(language, "homePrompt")}</p>
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
        <h2 className="mt-6 text-3xl leading-tight text-balance">
          {uiText(language, "homeTapSpeak")}
        </h2>
        <p className="mt-2 max-w-[34ch] text-center text-base text-ink/55">
          {uiText(language, "homeTapSpeakDescription")}
        </p>
      </section>

      <section className="mt-9 flex flex-wrap justify-center gap-2.5">
        {examples.map((example) => (
          <button
            key={example.text}
            onClick={() =>
              example.command ? openAssistantWith(example.command) : navigate({ to: example.to })
            }
            className="chip px-4 py-3 text-[15px] font-medium text-ink"
          >
            {example.text}
          </button>
        ))}
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="glass p-5">
          <p className="text-sm text-ink/55">{uiText(language, "homeCompletedValue")}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-clay">{rupees(total)}</p>
          <Link
            to="/sales"
            className="mt-3 flex items-center gap-1 text-base font-medium text-clay"
          >
            {uiText(language, "homeBusiness")} <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-ink/55">{uiText(language, "homeInMarket")}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{listed}</p>
          <Link
            to="/products"
            className="mt-3 flex items-center gap-1 text-base font-medium text-clay"
          >
            {uiText(language, "homeSeeProducts")} <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">{uiText(language, "homeRecentlyAdded")}</h2>
          <Link to="/products" className="text-base font-medium text-clay">
            {uiText(language, "homeSeeAll")}
          </Link>
        </div>

        {productsStatus === "loading" ? (
          <p className="mt-4 text-base text-ink/60" aria-live="polite">
            {uiText(language, "homeLoading")}
          </p>
        ) : productsStatus === "error" ? (
          <p className="mt-4 text-base text-destructive">
            {productsError ?? "Unable to load products."}
          </p>
        ) : products.length === 0 ? (
          <div className="glass mt-4 p-8 text-center">
            <p className="text-base text-ink/60">{uiText(language, "homeNoProducts")}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {products.slice(0, 2).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
