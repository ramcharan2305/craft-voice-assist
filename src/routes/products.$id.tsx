import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mic, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      { title: "Product details — H Connect" },
      { name: "description", content: "See and change one craft product: its photo, price, materials and buyer interest." },
      { property: "og:title", content: "Product details — H Connect" },
      { property: "og:description", content: "See and change one craft product: its photo, price, materials and buyer interest." },
    ],
  }),
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { id } = useParams({ from: "/products/$id" });
  const { products, openAssistant, removeProduct, setProductStatus, updateProduct, say } = useStore();
  const navigate = useNavigate();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editPrice, setEditPrice] = useState(false);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <AppShell>
        <div className="glass p-8 text-center">
          <h1 className="text-xl">This product isn't here anymore</h1>
          <Link
            to="/products"
            className="mt-5 inline-flex min-h-14 items-center rounded-2xl bg-clay px-6 text-base font-semibold text-white"
          >
            See my products
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/products" className="chip inline-flex min-h-12 items-center gap-2 px-4 text-base font-medium text-ink">
        <ArrowLeft className="size-5" /> My products
      </Link>

      <article className="glass mt-5 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" className="aspect-square w-full object-cover" />
        ) : null}
        <div className="p-6">
          <h1 className="text-3xl">{product.name}</h1>
          <p className="mt-2 text-base text-ink/65">{product.description}</p>
          <p className="mt-4 font-display text-4xl font-semibold text-clay">{rupees(product.price)}</p>

          <dl className="mt-6 space-y-3 text-[15px]">
            {[
              ["Category", product.category],
              ["Craft", product.craft],
              ["Colour", product.color],
              ["Materials", product.materials],
              ["Availability", product.availability],
              ["Status", product.status === "listed" ? "In the market" : product.status === "sold" ? "Sold" : "Not listed yet"],
              ["People who looked", String(product.views)],
              ["Buyers interested", String(product.interest)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-ink/5 pb-2">
                <dt className="text-ink/50">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <div className="mt-6 space-y-3">
        <button
          onClick={openAssistant}
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          <Mic className="size-6" /> Ask AI about this product
        </button>

        {editPrice ? (
          <form
            className="glass flex flex-col gap-3 p-5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(new FormData(e.currentTarget).get("price"));
              if (value > 0) {
                updateProduct(product.id, { price: value });
                say(`${product.name} now costs ${rupees(value)}.`);
              }
              setEditPrice(false);
            }}
          >
            <input
              name="price"
              type="number"
              defaultValue={product.price}
              aria-label="New price in rupees"
              className="min-h-14 flex-1 rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
            />
            <button className="min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white">Save price</button>
          </form>
        ) : (
          <button onClick={() => setEditPrice(true)} className="chip min-h-16 w-full text-base font-medium text-ink">
            Change the price
          </button>
        )}

        {product.status === "listed" ? (
          <button
            onClick={() => {
              setProductStatus(product.id, "draft");
              say(`${product.name} is removed from the market.`);
            }}
            className="chip min-h-16 w-full text-base font-medium text-ink"
          >
            Take it off the market
          </button>
        ) : (
          <button
            onClick={() => {
              setProductStatus(product.id, "listed");
              say(`${product.name} is back in the market.`);
            }}
            className="chip min-h-16 w-full text-base font-medium text-ink"
          >
            Put it in the market
          </button>
        )}

        <button
          onClick={() => setConfirmRemove(true)}
          className="chip flex min-h-16 w-full items-center justify-center gap-2 text-base font-medium text-destructive"
        >
          <Trash2 className="size-5" /> Delete this product
        </button>
      </div>

      <ConfirmationModal
        open={confirmRemove}
        danger
        title={`Delete ${product.name}?`}
        detail="Buyers will not see it again. You can always add it back later."
        confirmLabel="Yes, delete it"
        onConfirm={() => {
          removeProduct(product.id);
          say(`${product.name} is deleted.`);
          navigate({ to: "/products" });
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </AppShell>
  );
}
