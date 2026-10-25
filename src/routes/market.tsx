import { createFileRoute } from "@tanstack/react-router";
import { Mic, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { marketApi, type MarketResponse } from "@/api/marketApi";
import { useResource } from "@/hooks/use-resource";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market information — H Connect" },
      { name: "description", content: "Sample demand and price ranges for common crafts by region." },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const { openAssistant } = useStore();
  const resource = useResource<MarketResponse>(() => marketApi.getInsights(), []);

  return (
    <AppShell>
      <h1 className="text-3xl">Market information</h1>
      <p className="mt-2 text-base text-ink/60">Say “What is the market like for sarees?”</p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> Ask about the market
      </button>

      <div className="mt-8">
        <ResourceView
          resource={resource}
          isEmpty={(data) => data.items.length === 0}
          emptyTitle="No market figures yet"
          emptyDetail="Run the seed script in backend/ to load sample figures."
        >
          {(data) => (
            <>
              <p className="glass p-4 text-sm text-ink/60">{data.note} Seeded for the demo, not a live feed.</p>
              <div className="mt-4 space-y-3">
                {data.items.map((item) => {
                  const rising = item.trend.toLowerCase() === "rising";
                  return (
                    <article key={item.id} className="glass p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold">{item.product_category}</h2>
                          <p className="mt-1 text-sm text-ink/55">{item.region}</p>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-sage/15 px-3 py-1 text-xs font-medium text-sage">
                          {rising ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                          {item.trend}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
                        <div>
                          <dt className="text-sm text-ink/50">Demand</dt>
                          <dd className="font-medium">{item.demand}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-ink/50">Price range</dt>
                          <dd className="font-medium">{item.price_range}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-ink/45">Source: {item.source}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </ResourceView>
      </div>
    </AppShell>
  );
}