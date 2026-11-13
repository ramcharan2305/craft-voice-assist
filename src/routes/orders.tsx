import { createFileRoute } from "@tanstack/react-router";
import { Mic } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { orderApi, type Order, type OrderStatus } from "@/api/orderApi";
import { useResource } from "@/hooks/use-resource";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My orders — H Connect" },
      { name: "description", content: "Every order for your crafts, with its buyer, amount and status." },
    ],
  }),
  component: OrdersPage,
});

const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "completed", "cancelled"];

const TONE: Record<OrderStatus, string> = {
  pending: "bg-ink/10 text-ink/60",
  confirmed: "bg-sage/15 text-sage",
  shipped: "bg-clay/12 text-clay",
  completed: "bg-sage text-white",
  cancelled: "bg-destructive/12 text-destructive",
};

const LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected",
};

function OrdersPage() {
  const { openAssistant, refreshOrders, refreshDashboard } = useStore();
  const resource = useResource<Order[]>(() => orderApi.getOrders(), []);

  const handlePaymentDecision = async (orderId: string, status: "verified" | "rejected") => {
    try {
      await orderApi.updatePaymentStatus(orderId, status);
      await Promise.all([refreshOrders(), refreshDashboard()]);
      resource.reload();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl">My orders</h1>
      <p className="mt-2 text-base text-ink/60">Say “Show my orders” and your assistant will read them out.</p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> “What have I sold?”
      </button>

      <div className="mt-8">
        <ResourceView
          resource={resource}
          isEmpty={(orders) => orders.length === 0}
          emptyTitle="No orders yet"
          emptyDetail="When a buyer orders one of your products it will appear here."
        >
          {(orders) => (
            <div className="space-y-3">
              {orders.map((order) => (
                <article key={order.id} className="glass p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium">{order.product_name}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {order.buyer_name} · {order.quantity} piece{order.quantity === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-ink/45">
                        Order {order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <p className="font-display text-xl font-semibold text-clay">{rupees(order.amount)}</p>
                  </div>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${TONE[order.status]}`}>
                    {LABEL[order.status]}
                  </span>
                  {order.payment_status !== "pending" || order.payment_screenshot || order.payment_utr ? (
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-3 text-sm text-ink/70">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">Payment</span>
                        <span className="rounded-full bg-sage/12 px-2 py-1 text-xs font-medium text-sage">
                          {PAYMENT_LABEL[order.payment_status] ?? "Awaiting payment"}
                        </span>
                      </div>
                      {order.payment_utr ? <p className="mt-2">UTR: {order.payment_utr}</p> : null}
                      {order.payment_screenshot ? (
                        <img
                          src={order.payment_screenshot}
                          alt="Buyer payment screenshot"
                          className="mt-3 h-28 w-28 rounded-xl border border-black/5 object-cover"
                        />
                      ) : null}
                      {order.payment_status === "submitted" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePaymentDecision(order.id, "verified")}
                            className="min-h-11 rounded-xl bg-sage px-3 text-sm font-semibold text-white"
                          >
                            Verify payment
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePaymentDecision(order.id, "rejected")}
                            className="min-h-11 rounded-xl bg-destructive/10 px-3 text-sm font-semibold text-destructive"
                          >
                            Reject payment
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </ResourceView>
      </div>
    </AppShell>
  );
}