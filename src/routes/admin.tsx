import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  ExternalLink,
  Globe2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  adminApi,
  type AdminArtisan,
  type AdminOpportunity,
  type AdminSummary,
  type ReviewAction,
} from "@/api/adminApi";
import type { CrawlRun } from "@/api/opportunityApi";
import type { Product } from "@/lib/mock-data";
import { AppShell } from "@/components/AppShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — H Connect" },
      { name: "description", content: "Verify artisans and review product listings." },
    ],
  }),
  component: AdminPage,
});

const EMPTY_SUMMARY: AdminSummary = {
  artisans: 0,
  pendingArtisans: 0,
  approvedProducts: 0,
  pendingProducts: 0,
};

function AdminPage() {
  const { say } = useStore();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [artisans, setArtisans] = useState<AdminArtisan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [opportunities, setOpportunities] = useState<AdminOpportunity[]>([]);
  const [crawlStatus, setCrawlStatus] = useState<CrawlRun | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [opportunityToDelete, setOpportunityToDelete] = useState<AdminOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [opportunityFailure, setOpportunityFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const [nextSummary, nextArtisans, nextProducts] = await Promise.all([
        adminApi.getSummary(),
        adminApi.getArtisans("pending"),
        adminApi.getProducts(),
      ]);
      setSummary(nextSummary);
      setArtisans(nextArtisans);
      setProducts(nextProducts);
      try {
        const [nextOpportunities, nextCrawlStatus] = await Promise.all([
          adminApi.getOpportunities(),
          adminApi.getOpportunityCrawlStatus(),
        ]);
        setOpportunities(nextOpportunities);
        setCrawlStatus(nextCrawlStatus);
        setOpportunityFailure(null);
      } catch (error) {
        setOpportunityFailure(
          error instanceof Error ? error.message : "Unable to load opportunity records.",
        );
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to load the admin workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (crawlStatus?.status !== "running") return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const latest = await adminApi.getOpportunityCrawlStatus();
        if (!active) return;
        if (latest && latest.status !== "running") {
          const nextOpportunities = await adminApi.getOpportunities();
          if (!active) return;
          setCrawlStatus(latest);
          setOpportunityFailure(
            latest.status === "failed"
              ? (latest.errors[0]?.message ?? "The opportunity crawl failed.")
              : null,
          );
          setOpportunities(nextOpportunities);
        } else {
          if (latest) setCrawlStatus(latest);
          timer = setTimeout(() => void poll(), 2000);
        }
      } catch (error) {
        if (!active) return;
        setOpportunityFailure(
          error instanceof Error ? error.message : "Unable to check crawl progress.",
        );
        timer = setTimeout(() => void poll(), 5000);
      }
    };

    timer = setTimeout(() => void poll(), 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [crawlStatus?.status]);

  const reviewArtisan = async (artisan: AdminArtisan, action: ReviewAction) => {
    const note = feedback[artisan.id]?.trim() ?? "";
    if (action !== "approve" && !note) {
      setFailure("Add feedback before rejecting or requesting artisan corrections.");
      return;
    }
    setBusy(artisan.id);
    setFailure(null);
    try {
      await adminApi.reviewArtisan(artisan.id, action, note);
      say(`${artisan.name} review saved.`);
      setFeedback((current) => ({ ...current, [artisan.id]: "" }));
      await refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to update artisan review.");
    } finally {
      setBusy(null);
    }
  };

  const reviewProduct = async (product: Product, action: ReviewAction) => {
    const note = feedback[product.id]?.trim() ?? "";
    if (action !== "approve" && !note) {
      setFailure("Add feedback before rejecting a product or requesting corrections.");
      return;
    }
    setBusy(product.id);
    setFailure(null);
    try {
      await adminApi.reviewProduct(product.id, action, note);
      say(`${product.name} review saved.`);
      setFeedback((current) => ({ ...current, [product.id]: "" }));
      await refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to update product review.");
    } finally {
      setBusy(null);
    }
  };

  const deleteProduct = async (product: Product) => {
    setBusy(product.id);
    setFailure(null);
    try {
      await adminApi.deleteProduct(product.id);
      say(`${product.name} was removed.`);
      setProductToDelete(null);
      await refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to remove this product.");
    } finally {
      setBusy(null);
    }
  };

  const crawlOpportunities = async () => {
    setBusy("opportunity-crawl");
    setOpportunityFailure(null);
    try {
      const run = await adminApi.crawlOpportunities();
      setCrawlStatus(run);
      say("Opportunity crawl started. Progress will update here.");
    } catch (error) {
      setOpportunityFailure(
        error instanceof Error ? error.message : "Unable to crawl trusted sources.",
      );
    } finally {
      setBusy(null);
    }
  };

  const reviewOpportunity = async (
    opportunity: AdminOpportunity,
    status: "approved" | "rejected",
  ) => {
    setBusy(opportunity.id);
    setOpportunityFailure(null);
    try {
      await adminApi.reviewOpportunity(opportunity.id, status);
      await refresh();
    } catch (error) {
      setOpportunityFailure(
        error instanceof Error ? error.message : "Unable to update opportunity review.",
      );
    } finally {
      setBusy(null);
    }
  };

  const deleteOpportunity = async (opportunity: AdminOpportunity) => {
    setBusy(opportunity.id);
    setOpportunityFailure(null);
    try {
      await adminApi.deleteOpportunity(opportunity.id);
      setOpportunityToDelete(null);
      await refresh();
    } catch (error) {
      setOpportunityFailure(
        error instanceof Error ? error.message : "Unable to remove this opportunity.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell role="admin">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-clay">
            <ShieldCheck className="size-4" /> H Connect operations
          </p>
          <h1 className="mt-2 text-4xl">Admin overview</h1>
          <p className="mt-2 max-w-2xl text-base text-ink/60">
            Verify artisan registrations and approve, reject, or request corrections for product
            listings.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="chip inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-ink"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh records
        </button>
      </header>

      {failure ? (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {failure}
        </div>
      ) : null}

      <section
        className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Artisan and listing review metrics"
      >
        <MetricCard
          icon={Users}
          label="Artisans"
          value={summary.artisans}
          detail={`${summary.pendingArtisans} awaiting verification`}
        />
        <MetricCard
          icon={PackageCheck}
          label="Approved listings"
          value={summary.approvedProducts}
          detail={`${summary.pendingProducts} awaiting review`}
        />
        <MetricCard
          icon={CircleAlert}
          label="Reviews due"
          value={summary.pendingArtisans + summary.pendingProducts}
          detail="Artisan and product queues"
        />
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-ink/60" aria-live="polite">
          Loading database records…
        </p>
      ) : null}

      <section className="mt-9" aria-labelledby="artisan-review-heading">
        <SectionHeading
          headingId="artisan-review-heading"
          icon={Users}
          eyebrow="Onboarding"
          title="Artisan verification"
          count={artisans.length}
        />
        {!loading && artisans.length === 0 ? (
          <EmptyState>No artisans are waiting for verification.</EmptyState>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {artisans.map((artisan) => (
            <article key={artisan.id} className="glass p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{artisan.name || "Artisan"}</h3>
                  <p className="mt-1 text-sm text-ink/55">
                    {artisan.craft_type || "Craft not specified"} ·{" "}
                    {artisan.location || "Location not specified"}
                  </p>
                </div>
                <ReviewBadge status={artisan.verification_status} />
              </div>
              {artisan.verification_feedback ? (
                <p className="mt-3 text-sm text-clay">{artisan.verification_feedback}</p>
              ) : null}
              <label className="mt-4 block text-sm font-medium text-ink/70">
                Feedback for this artisan
                <textarea
                  rows={2}
                  value={feedback[artisan.id] ?? ""}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, [artisan.id]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-white/70 p-3 outline-none focus:ring-2 focus:ring-clay/30"
                />
              </label>
              <ReviewActions
                disabled={busy === artisan.id}
                onApprove={() => void reviewArtisan(artisan, "approve")}
                onReject={() => void reviewArtisan(artisan, "reject")}
                onCorrections={() => void reviewArtisan(artisan, "corrections")}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="product-review-heading">
        <SectionHeading
          headingId="product-review-heading"
          icon={PackageCheck}
          eyebrow="Marketplace quality"
          title="Product reviews and listings"
          count={products.length}
        />
        {!loading && products.length === 0 ? (
          <EmptyState>No product listings were found.</EmptyState>
        ) : null}
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="glass grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)] md:items-center md:p-5"
            >
              <div className="flex items-start gap-4">
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                ) : null}
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm text-ink/55">
                    {product.artisan_name || "Artisan"} · {product.category}
                  </p>
                  <ReviewBadge status={product.review_status ?? "approved"} />
                  <p className="mt-1 text-sm text-ink/55">{product.description}</p>
                  <p className="mt-2 font-semibold text-clay">
                    {rupees(product.price)} · {product.quantity} available
                  </p>
                  {product.review_feedback ? (
                    <p className="mt-2 text-sm text-clay">{product.review_feedback}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70">
                  Feedback for this product
                  <textarea
                    rows={2}
                    value={feedback[product.id] ?? ""}
                    onChange={(event) =>
                      setFeedback((current) => ({ ...current, [product.id]: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-ink/10 bg-white/70 p-3 outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </label>
                <ReviewActions
                  disabled={busy === product.id}
                  onApprove={() => void reviewProduct(product, "approve")}
                  onReject={() => void reviewProduct(product, "reject")}
                  onCorrections={() => void reviewProduct(product, "corrections")}
                />
                <button
                  type="button"
                  disabled={busy === product.id}
                  onClick={() => setProductToDelete(product)}
                  className="chip mt-2 inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Remove listing
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10" aria-labelledby="opportunity-review-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            headingId="opportunity-review-heading"
            icon={Globe2}
            eyebrow="Crawled opportunities"
            title="Opportunity review"
            count={opportunities.length}
          />
          <button
            type="button"
            onClick={() => void crawlOpportunities()}
            disabled={busy === "opportunity-crawl" || crawlStatus?.status === "running"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-clay px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${busy === "opportunity-crawl" ? "animate-spin" : ""}`} />
            {busy === "opportunity-crawl" ? "Crawling…" : "Crawl trusted sources"}
          </button>
        </div>
        {crawlStatus ? (
          <>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/55">
              <CalendarClock className="size-4" />
              Last crawl:{" "}
              {crawlStatus.completed_at
                ? new Date(crawlStatus.completed_at).toLocaleString()
                : new Date(crawlStatus.started_at).toLocaleString()}
              · {crawlStatus.status} · {crawlStatus.records_found} found ·{" "}
              {crawlStatus.records_added} new
            </p>
            {crawlStatus.errors.length ? (
              <ul className="mt-2 space-y-1 text-xs text-destructive">
                {crawlStatus.errors.map((crawlError, index) => (
                  <li key={`${crawlError.source ?? "crawler"}-${index}`}>
                    {crawlError.source ? `${crawlError.source}: ` : ""}
                    {crawlError.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        {opportunityFailure ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">
            {opportunityFailure}
          </p>
        ) : null}
        {opportunities.length === 0 && !opportunityFailure ? (
          <EmptyState>
            No crawled opportunities yet. Run a crawl to check the trusted sources.
          </EmptyState>
        ) : null}
        <div className="mt-4 space-y-3">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="glass p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                  <p className="mt-1 text-xs text-ink/50">
                    {opportunity.source_name} · Checked{" "}
                    {new Date(opportunity.last_checked_at).toLocaleString()}
                  </p>
                </div>
                <ReviewBadge status={opportunity.review_status} />
              </div>
              <p className="mt-3 text-sm text-ink/65">
                {opportunity.description || "No description found in the source page."}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                {opportunity.provider || "Provider not identified"} · {opportunity.category}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                {[
                  opportunity.location,
                  opportunity.business_category,
                  opportunity.product_category,
                  opportunity.opportunity_type,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Location and category not specified"}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Audience: {opportunity.target_audience || "Not specified"} · Starts:{" "}
                {opportunity.start_date || "Not specified"}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Status: {opportunity.status} · Eligibility:{" "}
                {opportunity.eligibility_requirements || "Not identified in source"} · Deadline:{" "}
                {opportunity.deadline || "Not specified"}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Explicit criteria: age{" "}
                {opportunity.age_min !== null || opportunity.age_max !== null
                  ? `${opportunity.age_min ?? "no minimum"}–${opportunity.age_max ?? "no maximum"}`
                  : "not specified"}
                {opportunity.gender_eligibility && opportunity.gender_eligibility !== "any"
                  ? ` · Gender: ${opportunity.gender_eligibility}`
                  : ""}
                {opportunity.experience_min !== null
                  ? ` · Experience: ${opportunity.experience_min}+ years`
                  : ""}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Benefits: {opportunity.benefits || "Not specified"}
                {opportunity.fees ? ` · Fees: ${opportunity.fees}` : ""}
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Application procedure: {opportunity.application_procedure || "Not specified"}
              </p>
              {opportunity.category === "COURSE_OR_TRAINING" ? (
                <p className="mt-2 text-sm text-ink/55">
                  Duration: {opportunity.duration || "Not specified"} · Delivery:{" "}
                  {opportunity.delivery_mode || "Not specified"} · Certification:{" "}
                  {opportunity.certification || "Not specified"}
                </p>
              ) : null}
              {opportunity.category === "MARKET_LINKAGE" ? (
                <p className="mt-2 text-sm text-ink/55">
                  Event: {opportunity.event_date || "Not specified"} · Venue:{" "}
                  {opportunity.venue || "Not specified"} · Products:{" "}
                  {opportunity.accepted_products || "Not specified"} · Buyers:{" "}
                  {opportunity.buyer_details || "Not specified"}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-ink/50">
                Last crawled: {new Date(opportunity.last_crawled_at).toLocaleString()}
                {opportunity.last_verified_at
                  ? ` · Last verified: ${new Date(opportunity.last_verified_at).toLocaleString()}`
                  : ""}
              </p>
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-clay"
              >
                Review original source <ExternalLink className="size-3.5" />
              </a>
              {opportunity.source_urls
                .filter((url) => url !== opportunity.source_url)
                .map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-4 mt-2 inline-flex items-center gap-1 text-sm font-medium text-clay"
                  >
                    Alternate source <ExternalLink className="size-3.5" />
                  </a>
                ))}
              {opportunity.application_url ? (
                <a
                  href={opportunity.application_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-4 mt-2 inline-flex items-center gap-1 text-sm font-medium text-clay"
                >
                  Application link <ExternalLink className="size-3.5" />
                </a>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === opportunity.id || opportunity.review_status === "approved"}
                  onClick={() => void reviewOpportunity(opportunity, "approved")}
                  className="min-h-10 rounded-xl bg-sage px-3 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === opportunity.id || opportunity.review_status === "rejected"}
                  onClick={() => void reviewOpportunity(opportunity, "rejected")}
                  className="chip min-h-10 px-3 text-sm font-semibold text-ink/70 disabled:opacity-45"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy === opportunity.id}
                  onClick={() => setOpportunityToDelete(opportunity)}
                  className="chip inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <ConfirmationModal
        open={productToDelete !== null}
        danger
        title={`Remove ${productToDelete?.name ?? "this listing"}?`}
        detail="This permanently removes the product from the marketplace. Existing buyer requests and order records will remain, without a product link."
        confirmLabel={busy === productToDelete?.id ? "Removing…" : "Yes, remove listing"}
        onConfirm={() => {
          if (productToDelete) void deleteProduct(productToDelete);
        }}
        onCancel={() => setProductToDelete(null)}
      />
      <ConfirmationModal
        open={opportunityToDelete !== null}
        danger
        title={`Remove ${opportunityToDelete?.title ?? "this opportunity"}?`}
        detail="This removes the opportunity from recommendations and keeps its crawl history marked as removed."
        confirmLabel={busy === opportunityToDelete?.id ? "Removing…" : "Yes, remove opportunity"}
        onConfirm={() => {
          if (opportunityToDelete) void deleteOpportunity(opportunityToDelete);
        }}
        onCancel={() => setOpportunityToDelete(null)}
      />
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="glass p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink/55">{label}</p>
        <Icon className="size-5 text-clay/75" strokeWidth={1.8} />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-ink/45">{detail}</p>
    </article>
  );
}

function SectionHeading({
  headingId,
  icon: Icon,
  eyebrow,
  title,
  count,
}: {
  headingId?: string;
  icon: typeof Users;
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-sage">
          <Icon className="size-4" />
          {eyebrow}
        </p>
        <h2 id={headingId} className="mt-1 text-2xl">
          {title}
        </h2>
      </div>
      <span className="text-sm text-ink/55">
        {count} record{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function ReviewActions({
  disabled,
  onApprove,
  onReject,
  onCorrections,
}: {
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCorrections: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        disabled={disabled}
        onClick={onApprove}
        className="min-h-10 rounded-xl bg-sage px-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={disabled}
        onClick={onCorrections}
        className="chip min-h-10 px-3 text-sm font-semibold text-ink/70 disabled:opacity-50"
      >
        Request corrections
      </button>
      <button
        disabled={disabled}
        onClick={onReject}
        className="min-h-10 rounded-xl border border-destructive/20 px-3 text-sm font-semibold text-destructive disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}

function ReviewBadge({ status }: { status: string }) {
  const label = status === "changes_requested" ? "Corrections requested" : status.replace("_", " ");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/8 px-2.5 py-1 text-xs font-medium capitalize text-ink/60">
      {status === "approved" ? <BadgeCheck className="size-3.5" /> : null}
      {label}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="glass mt-4 p-5 text-sm text-ink/55">{children}</p>;
}
