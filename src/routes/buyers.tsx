import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { enquiryApi } from "@/api/enquiryApi";
import type { BuyerRequest, BuyerRequestStatus } from "@/api/buyerApi";
import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { useResource } from "@/hooks/use-resource";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/buyers")({
  head: () => ({
    meta: [
      { title: "Buyer enquiries — H Connect" },
      {
        name: "description",
        content: "View and update requests from buyers for your products and services.",
      },
      { property: "og:title", content: "Buyer enquiries — H Connect" },
      {
        property: "og:description",
        content: "View and update requests from buyers for your products and services.",
      },
    ],
  }),
  component: BuyersPage,
});

const STATUS_LABELS: Record<BuyerRequestStatus, string> = {
  new: "New",
  in_progress: "In progress",
  responded: "Responded",
  closed: "Closed",
};

function BuyersPage() {
  const { say } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const resource = useResource<BuyerRequest[]>(() => enquiryApi.getEnquiries(), [refreshKey]);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (resource.status === "ready") setFailure(null);
  }, [resource.status]);

  const updateStatus = async (item: BuyerRequest, status: Exclude<BuyerRequestStatus, "new">) => {
    setBusy(item.id);
    setFailure(null);
    try {
      await enquiryApi.updateStatus(item.id, status);
      say("Buyer request status updated.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to update this request.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl">Buyer enquiries</h1>
      <p className="mt-2 text-base text-ink/60">
        Requests about your approved products and custom services appear here.
      </p>
      {failure ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <div className="mt-7">
        <ResourceView
          resource={resource}
          isEmpty={(items) => items.length === 0}
          emptyTitle="No enquiries yet"
          emptyDetail="Buyer questions, purchase requests, and service enquiries will appear here."
        >
          {(items) => (
            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="glass flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{item.product_name}</h2>
                      <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs capitalize text-clay">
                        {item.request_type}
                      </span>
                      <span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs text-sage">
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {item.buyer_name} · {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink/75">
                      {item.message ||
                        `${item.quantity} piece${item.quantity === 1 ? "" : "s"} requested`}
                    </p>
                  </div>
                  <label className="text-sm font-medium text-ink/65">
                    Update status
                    <select
                      value={item.status}
                      disabled={busy === item.id}
                      onChange={(event) =>
                        void updateStatus(
                          item,
                          event.target.value as Exclude<BuyerRequestStatus, "new">,
                        )
                      }
                      className="mt-1 min-h-11 w-full rounded-xl border border-ink/10 bg-white/70 px-3 sm:w-48"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}
        </ResourceView>
      </div>
    </AppShell>
  );
}
