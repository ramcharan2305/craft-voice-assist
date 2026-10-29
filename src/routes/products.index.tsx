import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { uiText } from "@/lib/ui-text";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "My products — H Connect" },
      {
        name: "description",
        content: "Every craft you have listed, with its price and status, in large simple cards.",
      },
      { property: "og:title", content: "My products — H Connect" },
      {
        property: "og:description",
        content: "Every craft you have listed, with its price and status, in large simple cards.",
      },
    ],
  }),
  component: ProductsPage,
});

const FILTERS = [
  { id: "all", label: "productsFilterAll" },
  { id: "pending", label: "productsFilterPending" },
  { id: "changes_requested", label: "productsFilterChanges" },
  { id: "rejected", label: "productsFilterRejected" },
  { id: "listed", label: "productsFilterListed" },
  { id: "draft", label: "productsFilterDraft" },
  { id: "sold", label: "productsFilterSold" },
] as const;

function ProductsPage() {
  const { products, openAssistant, productsStatus, productsError, refreshProducts, language } =
    useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const visible =
    filter === "all"
      ? products
      : ["pending", "changes_requested", "rejected"].includes(filter)
        ? products.filter((product) => (product.review_status ?? "approved") === filter)
        : filter === "listed"
          ? products.filter(
              (product) =>
                product.status === "listed" && (product.review_status ?? "approved") === "approved",
            )
          : products.filter((product) => product.status === filter);

  return (
    <AppShell>
      <h1 className="text-3xl">{uiText(language, "productsTitle")}</h1>
      <p className="mt-2 text-base text-ink/60">{uiText(language, "productsSubtitle")}</p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`chip px-4 py-3 text-[15px] font-medium ${filter === option.id ? "bg-clay text-white" : "text-ink"}`}
          >
            {uiText(language, option.label)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate({ to: "/list" })}
          className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          <Plus className="size-6" /> {uiText(language, "productsAdd")}
        </button>
        <button
          onClick={openAssistant}
          className="chip flex min-h-16 flex-1 items-center justify-center gap-2 text-base font-medium text-clay"
        >
          <Mic className="size-5" /> {uiText(language, "productsVoicePrompt")}
        </button>
      </div>

      {productsStatus === "loading" ? (
        <p className="mt-8 text-base text-ink/60" aria-live="polite">
          {uiText(language, "productsLoading")}
        </p>
      ) : productsStatus === "error" ? (
        <div className="mt-8">
          <ErrorNotice
            message={productsError ?? "Unable to load products."}
            actionLabel={uiText(language, "productsTryAgain")}
            onAction={() => void refreshProducts()}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="glass mt-8 p-8 text-center">
          <h2 className="text-xl">{uiText(language, "productsEmptyTitle")}</h2>
          <p className="mt-2 text-base text-ink/60">{uiText(language, "productsEmptyText")}</p>
          <button
            onClick={openAssistant}
            className="mt-5 min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white"
          >
            {uiText(language, "assistantButton")}
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
