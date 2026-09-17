import { createFileRoute } from "@tanstack/react-router";
import { Mic } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SalesSummary } from "@/components/SalesSummary";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Your business at a glance — Kalaa Setu" },
      { name: "description", content: "Products listed, products sold, money earned and buyer interest in one simple screen." },
      { property: "og:title", content: "Your business at a glance — Kalaa Setu" },
      { property: "og:description", content: "Products listed, products sold, money earned and buyer interest in one simple screen." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { products, sales, openAssistant } = useStore();
  const total = sales.reduce((sum, s) => sum + s.amount, 0);
  const interest = products.reduce((sum, p) => sum + p.interest, 0);

  return (
    <AppShell>
      <h1 className="text-3xl">Your business at a glance.</h1>
      <p className="mt-2 text-base text-ink/60">Sample figures for the demo.</p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> “What have I sold?”
      </button>

      <div className="mt-8">
        <SalesSummary
          stats={[
            { label: "Products listed", value: String(products.filter((p) => p.status === "listed").length) },
            { label: "Products sold", value: String(sales.length) },
            { label: "Money earned", value: rupees(total) },
            { label: "Buyers interested", value: String(interest) },
          ]}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg">What you sold</h2>
        <div className="mt-4 space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="glass flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-base font-medium">{sale.product}</p>
                <p className="mt-1 text-sm text-ink/55">
                  {sale.buyer} · {sale.when}
                </p>
              </div>
              <p className="font-display text-xl font-semibold text-clay">{rupees(sale.amount)}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
