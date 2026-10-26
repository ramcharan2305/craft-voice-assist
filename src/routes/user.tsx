import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Check, Search, Scissors, SlidersHorizontal, X } from "lucide-react";

import {
  buyerApi,
  type BuyerArtisan,
  type BuyerRequest,
  type BuyerRequestType,
} from "@/api/buyerApi";
import { AppShell } from "@/components/AppShell";
import { rupees, type Product } from "@/lib/mock-data";

export const Route = createFileRoute("/user")({
  head: () => ({
    meta: [
      { title: "Discover handmade crafts — H Connect" },
      {
        name: "description",
        content: "Explore approved handmade crafts and contact their artisans.",
      },
    ],
  }),
  component: BuyerPage,
});

const STATUS_LABEL: Record<BuyerRequest["status"], string> = {
  new: "Sent to artisan",
  in_progress: "In progress",
  responded: "Response received",
  closed: "Closed",
};

function BuyerPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All crafts");
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [artisans, setArtisans] = useState<BuyerArtisan[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [requestType, setRequestType] = useState<BuyerRequestType>("purchase");
  const [serviceRequestOpen, setServiceRequestOpen] = useState(false);
  const [artisanId, setArtisanId] = useState("");
  const [serviceType, setServiceType] = useState("Custom handloom weaving");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([buyerApi.getCatalog(), buyerApi.getRequests(), buyerApi.getArtisans()])
      .then(([catalog, savedRequests, verifiedArtisans]) => {
        if (!active) return;
        setProducts(catalog);
        setRequests(savedRequests);
        setArtisans(verifiedArtisans);
        setArtisanId(verifiedArtisans[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (active)
          setFailure(error instanceof Error ? error.message : "Unable to load marketplace data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All crafts", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pricePattern =
      /(?:under|below|less than)\s*(?:₹|rs\.?)?\s*([\d,]+)|(?:₹|rs\.?)\s*([\d,]+)/i;
    const priceMatch = term.match(pricePattern);
    const rawMaxPrice = priceMatch?.[1] ?? priceMatch?.[2];
    const maxPrice = rawMaxPrice ? Number(rawMaxPrice.replace(/,/g, "")) : null;
    const searchTerm = term
      .replace(pricePattern, " ")
      .replace(/\b(find|search|show|me|look|for|browse|please|rupees?|rs)\b/gi, " ")
      .replace(/[₹,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const searchTerms = searchTerm
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word.endsWith("ies")
          ? `${word.slice(0, -3)}y`
          : word.endsWith("s")
            ? word.slice(0, -1)
            : word,
      );
    return products.filter((product) => {
      const matchesCategory = category === "All crafts" || product.category === category;
      const haystack = [
        product.name,
        product.description,
        product.category,
        product.craft,
        product.materials,
      ]
        .join(" ")
        .toLowerCase();
      const matchesText = searchTerms.every((word) => haystack.includes(word));
      return matchesCategory && matchesText && (maxPrice === null || product.price <= maxPrice);
    });
  }, [category, products, query]);

  const openProductRequest = (product: Product, type: BuyerRequestType) => {
    setSelectedProduct(product);
    setRequestType(type);
    setQuantity(1);
    setNote("");
    setFailure(null);
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFailure(null);
    try {
      const created = await buyerApi.createRequest(
        selectedProduct
          ? { product_id: selectedProduct.id, request_type: requestType, quantity, message: note }
          : {
              artisan_id: artisanId,
              request_type: "service",
              quantity: 1,
              message: `${serviceType}: ${note.trim()}`,
            },
      );
      setRequests((current) => [created, ...current]);
      setSelectedProduct(null);
      setServiceRequestOpen(false);
      setShowRequests(true);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to send your request.");
    } finally {
      setSaving(false);
    }
  };

  const modalOpen = Boolean(selectedProduct) || serviceRequestOpen;

  return (
    <AppShell role="buyer">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-clay">
            Made by hand, made to last
          </p>
          <h1 className="mt-2 text-4xl">Find something meaningful.</h1>
          <p className="mt-2 max-w-xl text-base text-ink/60">
            Discover approved crafts and send purchase, question, or service requests directly to
            artisans.
          </p>
        </div>
        <button
          onClick={() => setShowRequests((visible) => !visible)}
          className="chip flex min-h-12 items-center gap-2 px-4 font-medium text-ink"
        >
          My requests{" "}
          <span className="grid size-6 place-items-center rounded-full bg-clay/12 text-xs text-clay">
            {requests.length}
          </span>
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

      {!showRequests ? (
        <section className="glass mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage/15 text-sage">
              <Scissors className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">Looking for something custom?</h2>
              <p className="mt-1 text-sm text-ink/55">
                Send a service request to a verified handloom artisan.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setServiceRequestOpen(true);
              setRequestType("service");
              setNote("");
              setFailure(null);
            }}
            disabled={artisans.length === 0}
            className="min-h-11 rounded-xl bg-sage px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Request a service
          </button>
        </section>
      ) : null}

      {showRequests ? (
        <section className="mt-8" aria-labelledby="requests-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="requests-heading" className="text-2xl">
                My requests
              </h2>
              <p className="mt-1 text-sm text-ink/55">Your requests and their latest status.</p>
            </div>
            <button
              onClick={() => setShowRequests(false)}
              className="chip min-h-10 px-4 text-sm font-medium"
            >
              Back to crafts
            </button>
          </div>
          {requests.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {requests.map((request) => (
                <article key={request.id} className="glass flex gap-4 p-4">
                  {request.product_image ? (
                    <img
                      src={request.product_image}
                      alt=""
                      className="size-20 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-sage/15 text-sage">
                      <Scissors className="size-7" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">{request.product_name}</h3>
                    <p className="mt-1 text-sm text-ink/55">
                      {request.request_type === "service"
                        ? "Service request"
                        : `${request.request_type === "purchase" ? "Purchase request" : "Product question"} · ${request.quantity} piece${request.quantity === 1 ? "" : "s"}`}
                    </p>
                    <p className="mt-1 text-sm text-ink/55">
                      Artisan: {request.artisan_name || "Assigned artisan"}
                    </p>
                    {request.message ? (
                      <p className="mt-1 break-words text-sm text-ink/55">{request.message}</p>
                    ) : null}
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sage/15 px-2.5 py-1 text-xs font-medium text-sage">
                      <Check className="size-3.5" /> {STATUS_LABEL[request.status]}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="glass mt-5 p-8 text-center">
              <h3 className="text-xl">No requests yet</h3>
              <p className="mt-2 text-sm text-ink/55">Choose a craft and contact its artisan.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mt-8" aria-label="Find crafts">
            <label className="glass flex min-h-14 items-center gap-3 px-4">
              <Search className="size-5 shrink-0 text-ink/45" />
              <span className="sr-only">Search products or maximum price</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sarees, baskets, or under ₹2,000…"
                className="w-full bg-transparent text-base outline-none placeholder:text-ink/40"
              />
            </label>
            <div
              className="mt-4 flex items-center gap-2 overflow-x-auto pb-1"
              aria-label="Craft categories"
            >
              <SlidersHorizontal className="size-4 shrink-0 text-ink/45" />
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`chip shrink-0 px-4 py-2.5 text-sm font-medium ${category === item ? "bg-clay text-white" : "text-ink/70"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-8" aria-labelledby="collection-heading">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 id="collection-heading" className="text-2xl">
                  The craft collection
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {visibleProducts.length} approved product{visibleProducts.length === 1 ? "" : "s"}
                </p>
              </div>
              <p className="hidden text-sm text-ink/50 sm:block">
                Listed by verified independent artisans
              </p>
            </div>
            {loading ? (
              <p className="mt-5 text-sm text-ink/55" aria-live="polite">
                Loading approved crafts…
              </p>
            ) : null}
            {!loading && visibleProducts.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product) => (
                  <article key={product.id} className="glass overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center bg-paper-2 text-sm text-ink/45">
                        No product photo
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-clay">
                        {product.category}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-semibold">{product.name}</h3>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-ink/55">
                        {product.description}
                      </p>
                      <p className="mt-2 text-xs text-ink/45">
                        {product.artisan_name || "Verified artisan"} · {product.artisan_location}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="font-display text-xl font-semibold text-clay">
                          {rupees(product.price)}
                        </span>
                        <span className="text-xs text-ink/50">{product.quantity} available</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openProductRequest(product, "purchase")}
                          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-3 text-sm font-semibold text-white"
                        >
                          Buy <ArrowRight className="size-4" />
                        </button>
                        <button
                          onClick={() => openProductRequest(product, "question")}
                          className="chip min-h-11 flex-1 px-3 text-sm font-semibold text-ink/70"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {!loading && visibleProducts.length === 0 ? (
              <div className="glass mt-5 p-8 text-center">
                <h3 className="text-xl">
                  {products.length ? "No crafts found" : "No approved products yet"}
                </h3>
                <p className="mt-2 text-sm text-ink/55">
                  {products.length
                    ? "Try another search or category."
                    : "Products appear here after an administrator approves them."}
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-3 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-title"
            className="glass-strong w-full max-w-lg p-5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-clay">
                  {serviceRequestOpen
                    ? "Request an artisan service"
                    : requestType === "purchase"
                      ? "Send purchase request"
                      : "Ask this artisan"}
                </p>
                <h2 id="request-title" className="mt-1 text-2xl">
                  {selectedProduct?.name ?? "Tell an artisan what you need"}
                </h2>
                {selectedProduct ? (
                  <p className="mt-1 text-sm text-ink/55">
                    {rupees(selectedProduct.price)} per piece · {selectedProduct.quantity} available
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setServiceRequestOpen(false);
                }}
                aria-label="Close request form"
                className="chip grid size-10 shrink-0 place-items-center"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={(event) => void submitRequest(event)} className="mt-5 space-y-4">
              {serviceRequestOpen ? (
                <>
                  <label className="block text-sm font-medium">
                    Choose an artisan
                    <select
                      required
                      value={artisanId}
                      onChange={(event) => setArtisanId(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-ink/10 bg-white/60 px-3 text-base"
                    >
                      {artisans.map((artisan) => (
                        <option key={artisan.id} value={artisan.id}>
                          {artisan.name} · {artisan.craft_type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Service
                    <select
                      value={serviceType}
                      onChange={(event) => setServiceType(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-ink/10 bg-white/60 px-3 text-base"
                    >
                      <option>Custom handloom weaving</option>
                      <option>Alterations or repair</option>
                      <option>Custom craft commission</option>
                    </select>
                  </label>
                </>
              ) : null}
              {selectedProduct && requestType === "purchase" ? (
                <label className="block text-sm font-medium">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={selectedProduct.quantity}
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="mt-2 min-h-12 w-full rounded-xl border border-ink/10 bg-white/60 px-3 text-base"
                  />
                </label>
              ) : null}
              <label className="block text-sm font-medium">
                {requestType === "question" || serviceRequestOpen
                  ? "Your message"
                  : "Add a note (optional)"}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  required={requestType === "question" || serviceRequestOpen}
                  maxLength={2000}
                  placeholder={
                    serviceRequestOpen
                      ? "Share size, materials, timing, or other details…"
                      : "Ask a question or share what you need…"
                  }
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-ink/10 bg-white/60 p-3 text-base outline-none focus:ring-2 focus:ring-clay/35"
                />
              </label>
              <p className="text-xs text-ink/50">
                This goes directly to the artisan. Admin only reviews artisan accounts and product
                listings; no payment is taken here.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 w-full rounded-xl bg-clay px-5 font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? "Sending…"
                  : serviceRequestOpen
                    ? "Send service request"
                    : requestType === "purchase"
                      ? "Send purchase request"
                      : "Send question"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
