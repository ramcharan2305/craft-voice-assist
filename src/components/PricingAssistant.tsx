import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

type Props = {
  suggested: number | null;
  marketLow: number | null;
  marketHigh: number | null;
  priceReason: string;
  onAccept: (price: number) => void;
};

export function PricingAssistant({
  suggested,
  marketLow,
  marketHigh,
  priceReason,
  onAccept,
}: Props) {
  const { openAssistant } = useStore();
  const [price, setPrice] = useState<number | null>(suggested);
  const [why, setWhy] = useState(false);
  const hasEstimate = suggested !== null && suggested > 0;
  const hasRange =
    hasEstimate &&
    marketLow !== null &&
    marketHigh !== null &&
    marketLow > 0 &&
    marketHigh >= marketLow;

  useEffect(() => setPrice(suggested), [suggested]);

  const min = hasRange ? Math.max(1, marketLow ?? 1) : 1;
  const max = hasRange ? Math.max(marketHigh ?? min + 1, min + 1) : 1;
  const position = hasRange && price !== null ? ((price - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">What should you charge?</h1>
        <p className="mt-2 text-base text-ink/60">
          {hasEstimate
            ? "Review this photo-based estimate; it is not verified market pricing."
            : "No reliable estimate is available. Consider your material costs and time, then enter the price you choose."}
        </p>
      </div>

      {hasEstimate && hasRange ? (
        <div className="glass space-y-4 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-base text-ink/60">AI-estimated price range</span>
            <span className="font-display text-xl font-semibold">
              {rupees(marketLow ?? 0)} – {rupees(marketHigh ?? 0)}
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
            <p className="mt-4 text-center font-display text-4xl font-semibold text-clay">
              {price === null ? "Choose a price" : rupees(price)}
            </p>
            <input
              type="range"
              min={min}
              max={max}
              step={50}
              value={price ?? suggested ?? min}
              onChange={(e) => setPrice(Number(e.target.value))}
              aria-label="Choose your price"
              className="mt-3 h-11 w-full accent-clay"
            />
          </div>
        </div>
      ) : hasEstimate ? (
        <div className="glass p-5">
          <p className="text-sm text-ink/60">Photo-analysis estimate</p>
          <p className="mt-1 font-display text-3xl font-semibold text-clay">
            {rupees(suggested ?? 0)}
          </p>
        </div>
      ) : null}

      {!hasRange ? (
        <label className="glass block p-5">
          <span className="text-sm font-medium text-ink/60">Your chosen price (₹)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={price ?? ""}
            onChange={(event) => setPrice(event.target.value ? Number(event.target.value) : null)}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-lg ring-1 ring-black/5 outline-none"
            aria-label="Enter your chosen price"
          />
        </label>
      ) : null}

      {why && hasEstimate ? (
        <div className="glass p-5">
          <p className="text-base text-ink/75">
            {priceReason || "This estimate comes from the product photo."} It is not verified market
            data. Adjust it to account for your actual material costs and time.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {hasEstimate ? (
          <button
            onClick={() => {
              if (suggested !== null) onAccept(suggested);
            }}
            className="min-h-16 rounded-2xl bg-clay text-lg font-semibold text-white"
          >
            Use estimate {rupees(suggested ?? 0)}
          </button>
        ) : null}
        <button
          disabled={price === null || !Number.isFinite(price) || price <= 0}
          onClick={() => {
            if (price !== null && Number.isFinite(price) && price > 0) onAccept(price);
          }}
          className="chip min-h-16 text-base font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {price !== null && price > 0
            ? `Use my price of ${rupees(price)}`
            : "Enter a price to continue"}
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          {hasEstimate ? (
            <button
              onClick={() => setWhy((v) => !v)}
              className="chip min-h-14 flex-1 text-base font-medium text-ink"
            >
              Why this price?
            </button>
          ) : null}
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
