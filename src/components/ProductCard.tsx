import { Link } from "@tanstack/react-router";
import { Circle, CircleCheck, CircleDot } from "lucide-react";

import { rupees, type Product } from "@/lib/mock-data";

const STATUS = {
  listed: { text: "Listed", Icon: CircleCheck, tone: "bg-sage/15 text-sage" },
  draft: { text: "Not listed yet", Icon: Circle, tone: "bg-ink/10 text-ink/60" },
  sold: { text: "Sold", Icon: CircleDot, tone: "bg-clay/12 text-clay" },
} as const;

export function ProductCard({ product }: { product: Product }) {
  const status = STATUS[product.status];
  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="glass block overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={816}
          height={816}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center bg-paper-2 text-sm text-ink/50">No photo yet</div>
      )}
      <div className="p-4">
        <p className="font-display text-lg leading-tight font-semibold text-balance">{product.name}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-xl font-semibold text-clay">{rupees(product.price)}</span>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.tone}`}>
            <status.Icon className="size-3.5" />
            {status.text}
          </span>
        </div>
      </div>
    </Link>
  );
}
