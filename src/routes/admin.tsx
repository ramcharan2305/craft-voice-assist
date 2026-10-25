import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CircleAlert,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { adminApi, type AdminArtisan, type AdminSummary, type ReviewAction } from "@/api/adminApi";
import type { BuyerRequest, BuyerRequestStatus } from "@/api/buyerApi";
import type { Product } from "@/lib/mock-data";
import { AppShell } from "@/components/AppShell";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — H Connect" },
      { name: "description", content: "Review artisans, products, and buyer enquiries." },
    ],
  }),
  component: AdminPage,
});

const EMPTY_SUMMARY: AdminSummary = {
  artisans: 0,
  pendingArtisans: 0,
  approvedProducts: 0,
  pendingProducts: 0,
  enquiries: 0,
  openEnquiries: 0,
};

const REQUEST_STATUS_LABELS: Record<BuyerRequestStatus, string> = {
  new: "New",
  in_progress: "In progress",
  responded: "Responded",
  closed: "Closed",
};

function AdminPage() {
  const { say } = useStore();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [artisans, setArtisans] = useState<AdminArtisan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<BuyerRequest[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const [nextSummary, nextArtisans, nextProducts, nextEnquiries] = await Promise.all([
        adminApi.getSummary(),
        adminApi.getArtisans("pending"),
        adminApi.getProducts("pending"),
        adminApi.getEnquiries(),
      ]);
      setSummary(nextSummary);
      setArtisans(nextArtisans);
      setProducts(nextProducts);
      setEnquiries(nextEnquiries);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to load the admin workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const updateEnquiry = async (enquiry: BuyerRequest, status: BuyerRequestStatus) => {
    setBusy(enquiry.id);
    setFailure(null);
    try {
      const updated = await adminApi.updateEnquiry(enquiry.id, status, feedback[enquiry.id] ?? "");
      setEnquiries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      say("Enquiry status updated.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to update enquiry.");
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
            Review artisan registrations and product listings, and respond to buyer requests.
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
        className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Live marketplace metrics"
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
          icon={ClipboardCheck}
          label="Buyer enquiries"
          value={summary.enquiries}
          detail={`${summary.openEnquiries} open`}
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
          icon={PackageCheck}
          eyebrow="Marketplace quality"
          title="Product review queue"
          count={products.length}
        />
        {!loading && products.length === 0 ? (
          <EmptyState>No products are waiting for review.</EmptyState>
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
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="enquiry-heading">
        <SectionHeading
          icon={ClipboardCheck}
          eyebrow="Buyer support"
          title="Buyer enquiries"
          count={enquiries.length}
        />
        {!loading && enquiries.length === 0 ? (
          <EmptyState>No buyer enquiries have been received yet.</EmptyState>
        ) : null}
        <div className="mt-4 space-y-3">
          {enquiries.map((enquiry) => (
            <article
              key={enquiry.id}
              className="glass grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center md:p-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{enquiry.product_name}</h3>
                  <span className="rounded-full bg-ink/8 px-2.5 py-1 text-xs text-ink/60">
                    {enquiry.request_type}
                  </span>
                  <span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs text-sage">
                    {REQUEST_STATUS_LABELS[enquiry.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/55">
                  {enquiry.buyer_name} → {enquiry.artisan_name || "Artisan"} ·{" "}
                  {new Date(enquiry.created_at).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-2 text-sm text-ink/70">
                  {enquiry.message ||
                    `${enquiry.quantity} piece${enquiry.quantity === 1 ? "" : "s"} requested`}
                </p>
                {enquiry.admin_feedback ? (
                  <p className="mt-1 text-sm text-clay">{enquiry.admin_feedback}</p>
                ) : null}
              </div>
              <label className="text-sm font-medium text-ink/70">
                Update status
                <select
                  value={enquiry.status}
                  disabled={busy === enquiry.id}
                  onChange={(event) =>
                    void updateEnquiry(enquiry, event.target.value as BuyerRequestStatus)
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-ink/10 bg-white/70 px-3 outline-none focus:ring-2 focus:ring-clay/30"
                >
                  {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>
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
  icon: Icon,
  eyebrow,
  title,
  count,
}: {
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
        <h2 className="mt-1 text-2xl">{title}</h2>
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
