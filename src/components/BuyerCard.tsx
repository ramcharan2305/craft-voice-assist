import type { Buyer } from "@/lib/mock-data";

export function BuyerCard({ buyer, onContact }: { buyer: Buyer; onContact: (buyer: Buyer) => void }) {
  return (
    <article className="glass p-5">
      <h3 className="text-lg">{buyer.name}</h3>
      <p className="mt-1 text-sm font-medium text-clay">{buyer.match} compatibility</p>
      <dl className="mt-4 space-y-3 text-[15px]">
        <div>
          <dt className="text-ink/50">Looking for</dt>
          <dd>{buyer.lookingFor}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Location</dt>
          <dd>{buyer.location}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Quantity</dt>
          <dd>{buyer.quantity}</dd>
        </div>
      </dl>
      <button
        onClick={() => onContact(buyer)}
        className="mt-5 min-h-14 w-full rounded-2xl bg-clay text-base font-semibold text-white"
      >
        Send my products
      </button>
    </article>
  );
}
