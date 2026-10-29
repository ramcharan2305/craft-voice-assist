type Stat = { label: string; value: string };

export function SalesSummary({ stats }: { stats: Stat[] }) {
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
        <h2 className="text-lg">Monthly sales breakdown</h2>
        <p className="mt-3 text-sm text-ink/60">
          Monthly totals and payment collection are not tracked. The values above come from
          completed or shipped order records and are not payment-verified.
        </p>
      </section>
    </div>
  );
}
