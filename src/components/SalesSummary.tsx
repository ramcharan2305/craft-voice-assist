import { MONTHLY_SALES, rupees } from "@/lib/mock-data";

type Stat = { label: string; value: string };

export function SalesSummary({ stats }: { stats: Stat[] }) {
  const max = Math.max(...MONTHLY_SALES.map((m) => m.value));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass p-5">
            <p className="text-sm text-ink/55">{stat.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="glass p-5">
        <h2 className="text-lg">Money earned each month</h2>
        <div className="mt-5 flex h-40 items-end gap-3">
          {MONTHLY_SALES.map((month) => (
            <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-ink/60">{rupees(month.value)}</span>
              <div
                className="w-full rounded-t-xl bg-clay/80"
                style={{ height: `${(month.value / max) * 100}%` }}
                role="img"
                aria-label={`${month.month}: ${rupees(month.value)}`}
              />
              <span className="text-xs font-medium text-ink/60">{month.month}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
