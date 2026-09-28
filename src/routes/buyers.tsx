import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, ChevronRight, Landmark, Mic, Store, Truck, Warehouse } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BuyerCard } from "@/components/BuyerCard";
import { BUYER_GROUPS, DEMO_BUYERS, type BuyerGroupId } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/buyers")({
  head: () => ({
    meta: [
      { title: "Find buyers — H Connect" },
      { name: "description", content: "See the kinds of buyers looking for handmade crafts like yours." },
      { property: "og:title", content: "Find buyers — H Connect" },
      { property: "og:description", content: "See the kinds of buyers looking for handmade crafts like yours." },
    ],
  }),
  component: BuyersPage,
});

const ICONS: Record<BuyerGroupId, typeof Store> = {
  retail: Store,
  wholesale: Warehouse,
  business: Building2,
  institution: Truck,
  government: Landmark,
  local: Store,
};

function BuyersPage() {
  const { openAssistant, say } = useStore();
  const [group, setGroup] = useState<BuyerGroupId | null>(null);

  const buyers = group ? DEMO_BUYERS.filter((b) => b.group === group) : DEMO_BUYERS;
  const groupTitle = BUYER_GROUPS.find((g) => g.id === group)?.title;

  return (
    <AppShell>
      <h1 className="text-3xl">Find buyers for your craft.</h1>
      <p className="mt-2 text-base text-ink/60">
        These are sample buyers for the demo, not real companies.
      </p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> “Find buyers for my baskets”
      </button>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {BUYER_GROUPS.map((item) => {
          const Icon = ICONS[item.id];
          const active = group === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setGroup(active ? null : item.id)}
              className={`glass p-5 text-left ${active ? "ring-2 ring-clay" : ""}`}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-clay/12 text-clay">
                <Icon className="size-6" strokeWidth={1.8} />
              </span>
              <h2 className="mt-4 text-lg">{item.title}</h2>
              <p className="mt-1 text-sm text-ink/55">{item.note}</p>
              <p className="mt-3 flex items-center gap-1 text-base font-medium text-clay">
                {item.matches} possible matches <ChevronRight className="size-4" />
              </p>
            </button>
          );
        })}
      </section>

      <section className="mt-10">
        <h2 className="text-lg">{groupTitle ? `${groupTitle} interested in crafts like yours` : "Buyers interested in products like yours"}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {buyers.map((buyer) => (
            <BuyerCard key={buyer.id} buyer={buyer} onContact={(b) => say(`I've shared your products with ${b.name}.`)} />
          ))}
        </div>
        {buyers.length === 0 ? (
          <div className="glass mt-4 p-8 text-center">
            <p className="text-base text-ink/60">No buyers in this group yet. Try another group.</p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
