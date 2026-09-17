import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "My products — Kalaa Setu" },
      { name: "description", content: "Every craft you have listed, with its price and status, in large simple cards." },
      { property: "og:title", content: "My products — Kalaa Setu" },
      { property: "og:description", content: "Every craft you have listed, with its price and status, in large simple cards." },
    ],
  }),
  component: ProductsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "listed", label: "In the market" },
  { id: "draft", label: "Not listed" },
  { id: "sold", label: "Sold" },
] as const;

function ProductsPage() {
  const { products, openAssistant } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const visible = filter === "all" ? products : products.filter((p) => p.status === filter);

  return (
    <AppShell>
      <h1 className="text-3xl">My products</h1>
      <p className="mt-2 text-base text-ink/60">Tap any product to see it or change it.</p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`chip px-4 py-3 text-[15px] font-medium ${filter === option.id ? "bg-clay text-white" : "text-ink"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate({ to: "/list" })}
          className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          <Plus className="size-6" /> Add a product
        </button>
        <button
          onClick={openAssistant}
          className="chip flex min-h-16 flex-1 items-center justify-center gap-2 text-base font-medium text-clay"
        >
          <Mic className="size-5" /> “Show me my sarees”
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="glass mt-8 p-8 text-center">
          <h2 className="text-xl">Nothing here yet</h2>
          <p className="mt-2 text-base text-ink/60">Speak to me and I'll add your first product.</p>
          <button
            onClick={openAssistant}
            className="mt-5 min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white"
          >
            Tap and speak
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
