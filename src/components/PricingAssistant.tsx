import { useState } from "react";
import { Mic } from "lucide-react";

import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

type Props = {
  suggested: number;
  cost: number;
  marketLow: number;
  marketHigh: number;
  onAccept: (price: number) => void;
};

export function PricingAssistant({ suggested, cost, marketLow, marketHigh, onAccept }: Props) {
  const { openAssistant } = useStore();
  const [price, setPrice] = useState(suggested);
  const [why, setWhy] = useState(false);

  const min = Math.round(cost * 0.9);
  const max = Math.round(marketHigh * 1.2);
  const position = ((price - min) / (max - min)) * 100;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">What should you charge?</h1>
        <p className="mt-2 text-base text-ink/60">You decide the final price. I only suggest.</p>
      </div>

      <div className="glass space-y-4 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-base text-ink/60">Your cost to make it</span>
          <span className="font-display text-xl font-semibold">{rupees(cost)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-base text-ink/60">Similar products sell for</span>
          <span className="font-display text-xl font-semibold">
            {rupees(marketLow)} – {rupees(marketHigh)}
          </span>
        </div>

        <div className="pt-2">
          <div className="relative h-4 rounded-full bg-paper-2">
            <div
              className="absolute inset-y-0 rounded-full bg-sage/40"
              style={{
                left: `${((marketLow - min) / (max - min)) * 100}%`,
                width: `${((marketHigh - marketLow) / (max - min)) * 100}%`,
              }}
            />
            <span
              className="absolute -top-1.5 size-7 -translate-x-1/2 rounded-full bg-clay ring-4 ring-white/80 transition-all"
              style={{ left: `${Math.min(Math.max(position, 0), 100)}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-4 text-center font-display text-4xl font-semibold text-clay">{rupees(price)}</p>
          <input
            type="range"
            min={min}
            max={max}
            step={50}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-label="Choose your price"
            className="mt-3 h-11 w-full accent-clay"
          />
        </div>
      </div>

      {why ? (
        <div className="glass p-5">
          <p className="text-base text-ink/75">
            Your materials and days of work come to about {rupees(cost)}. Similar handmade pieces sell between{" "}
            {rupees(marketLow)} and {rupees(marketHigh)}. So {rupees(suggested)} keeps a fair earning for you and still
            looks reasonable to buyers.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onAccept(suggested)}
          className="min-h-16 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          Use {rupees(suggested)}
        </button>
        <button onClick={() => onAccept(price)} className="chip min-h-16 text-base font-medium text-ink">
          Use my price of {rupees(price)}
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => setWhy((v) => !v)} className="chip min-h-14 flex-1 text-base font-medium text-ink">
            Ask me why
          </button>
          <button
            onClick={openAssistant}
            className="chip flex min-h-14 flex-1 items-center justify-center gap-2 text-base font-medium text-clay"
          >
            <Mic className="size-5" /> Say a price
          </button>
        </div>
      </div>
    </div>
  );
}
