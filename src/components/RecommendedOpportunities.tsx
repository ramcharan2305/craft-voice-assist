import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";

import {
  opportunityApi,
  type OpportunityCategory,
  type Opportunity,
  type OpportunityRecommendations,
} from "@/api/opportunityApi";

const CATEGORIES: Array<{ key: OpportunityCategory; label: string }> = [
  { key: "GOVERNMENT_SCHEME", label: "Government Schemes" },
  { key: "COURSE_OR_TRAINING", label: "Courses & Training" },
  { key: "MARKET_LINKAGE", label: "Market Linkage" },
];

const EMPTY: OpportunityRecommendations = {
  categories: {
    GOVERNMENT_SCHEME: [],
    COURSE_OR_TRAINING: [],
    MARKET_LINKAGE: [],
  },
  highly_relevant: [],
  potentially_relevant: [],
  eligibility_not_verified: [],
};

export function RecommendedOpportunities() {
  const [results, setResults] = useState<OpportunityRecommendations>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<OpportunityCategory | "">("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResults(await opportunityApi.getRecommendations());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allOpportunities = useMemo(
    () => CATEGORIES.flatMap(({ key }) => results.categories[key]),
    [results],
  );
  const locations = useMemo(
    () => unique(allOpportunities.map((item) => item.location)),
    [allOpportunities],
  );
  const visible = (item: Opportunity) => !location || item.location === location;

  return (
    <section className="mt-10" aria-labelledby="recommended-heading">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-sage">
            Artisan opportunities
          </p>
          <h2 id="recommended-heading" className="mt-1 text-2xl">
            Opportunities for You
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            Recommendations use your profile and published details. Always confirm eligibility with
            the source.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="chip inline-flex min-h-10 items-center gap-2 px-3 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CategoryFilter value={category} onChange={setCategory} />
        <LocationFilter value={location} onChange={setLocation} options={locations} />
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-ink/55" aria-live="polite">
          Finding opportunities for you…
        </p>
      ) : null}
      {!loading && !error && allOpportunities.length === 0 ? (
        <p className="glass mt-4 p-5 text-sm text-ink/55">
          No reviewed opportunities are available yet. Check back after an administrator reviews new
          listings.
        </p>
      ) : null}

      <div className="mt-5 space-y-7">
        {CATEGORIES.map((group) => {
          if (category && category !== group.key) return null;
          const items = results.categories[group.key].filter(visible);
          if (!items.length) return null;
          return (
            <section key={group.key} aria-label={group.label}>
              <h3 className="text-lg font-semibold">{group.label}</h3>
              <div className="mt-3 grid gap-3">
                {items.map((item) => (
                  <OpportunityCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function OpportunityCard({ item }: { item: Opportunity }) {
  const eligibilityText = item.eligibility_requirements || item.eligibility_text || null;

  return (
    <article className="glass p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-lg font-semibold text-balance">{item.title}</h4>
        <span className="rounded-full bg-sage/12 px-3 py-1 text-xs font-medium text-sage">
          {item.recommendation_group === "highly_relevant"
            ? "Highly relevant"
            : item.recommendation_group === "potentially_relevant"
              ? "Potential match"
              : "Eligibility not verified"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink/65">
        {item.description || "No description was provided in the source content."}
      </p>
      {item.location ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/55">
          <MapPin className="size-4" /> {item.location}
        </p>
      ) : null}
      <Info label="Provider" value={item.provider} />
      <Info label="Business / artisan category" value={item.business_category || null} />
      <Info label="Product category" value={item.product_category || null} />
      <p className="mt-3 text-sm font-medium text-clay">Why it matches</p>
      <ul className="mt-1 list-inside list-disc text-sm text-ink/65">
        {item.match_reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <Info label="For" value={item.target_audience} />
      <Info
        label="Eligibility"
        value={eligibilityText}
        fallback="Not verified from the published source. Confirm with the provider."
      />
      <Info label="Explicit age criterion" value={ageCriterion(item)} />
      <Info
        label="Explicit gender criterion"
        value={
          item.gender_eligibility && item.gender_eligibility !== "any"
            ? item.gender_eligibility
            : null
        }
      />
      <Info label="Benefits" value={item.benefits} />
      <Info label="Fees" value={item.fees} />
      {item.category === "COURSE_OR_TRAINING" ? (
        <>
          <Info label="Duration" value={item.duration} />
          <Info label="Delivery" value={item.delivery_mode} />
          <Info label="Certification" value={item.certification} />
        </>
      ) : null}
      {item.category === "MARKET_LINKAGE" ? (
        <>
          <Info label="Venue" value={item.venue} />
          <Info label="Accepted products" value={item.accepted_products} />
          <Info label="Buyer details" value={item.buyer_details} />
        </>
      ) : null}
      <Info label="How to apply" value={item.application_procedure} />
      <p className="mt-3 text-xs text-ink/50">
        {item.start_date ? `Starts: ${item.start_date}` : null}
        {item.event_date ? ` · Event: ${item.event_date}` : null}
        {item.deadline ? ` · Deadline: ${item.deadline}` : ""}
        {` · Checked ${new Date(item.last_crawled_at).toLocaleDateString()}`}
      </p>
      <a
        href={item.application_url || item.source_url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-clay"
      >
        {item.application_url ? "Apply / register" : "Original source"} · {item.source_name}{" "}
        <ExternalLink className="size-4" />
      </a>
    </article>
  );
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: OpportunityCategory | "";
  onChange: (value: OpportunityCategory | "") => void;
}) {
  return (
    <label className="text-xs font-medium text-ink/55">
      Opportunity category
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink ring-1 ring-black/5 outline-none"
      >
        <option value="">All</option>
        {CATEGORIES.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LocationFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-xs font-medium text-ink/55">
      Location
      <select
        value={value}
        onChange={(event) =>
          onChange(CATEGORIES.find((option) => option.key === event.target.value)?.key ?? "")
        }
        className="mt-1 min-h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink ring-1 ring-black/5 outline-none"
      >
        <option value="">All locations</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Info({
  label,
  value,
  fallback = "Not specified by the source",
}: {
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <p className="mt-2 text-sm text-ink/60">
      <span className="font-medium text-ink/75">{label}: </span>
      {value || fallback}
    </p>
  );
}

function ageCriterion(item: Opportunity) {
  if (item.age_min === null && item.age_max === null) return null;
  if (item.age_min !== null && item.age_max !== null) {
    return `${item.age_min}–${item.age_max} years`;
  }
  if (item.age_min !== null) return `${item.age_min}+ years`;
  return `Up to ${item.age_max} years`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
