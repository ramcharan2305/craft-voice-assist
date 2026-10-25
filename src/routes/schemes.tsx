import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Mic } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { schemeApi, type Scheme } from "@/api/schemeApi";
import { useResource } from "@/hooks/use-resource";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Government schemes — H Connect" },
      { name: "description", content: "Schemes and benefits that artisans can apply for, with the official links." },
    ],
  }),
  component: SchemesPage,
});

const DETAILS: Array<[keyof Scheme, string]> = [
  ["eligibility", "Who can apply"],
  ["benefits", "What you get"],
  ["application_process", "How to apply"],
];

function SchemesPage() {
  const { openAssistant } = useStore();
  const resource = useResource<Scheme[]>(() => schemeApi.getSchemes(), []);

  return (
    <AppShell>
      <h1 className="text-3xl">Government schemes</h1>
      <p className="mt-2 text-base text-ink/60">Ask your assistant: “What government schemes are available?”</p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> Ask about schemes
      </button>

      <div className="mt-8">
        <ResourceView
          resource={resource}
          isEmpty={(items) => items.length === 0}
          emptyTitle="No schemes are listed yet"
          emptyDetail="Run the seed script in backend/ to load the sample schemes."
        >
          {(schemes) => (
            <div className="space-y-4">
              {schemes.map((scheme) => (
                <article key={scheme.id} className="glass p-5">
                  <h2 className="text-xl font-semibold text-balance">{scheme.name}</h2>
                  <p className="mt-2 text-base text-ink/65">{scheme.description}</p>
                  <dl className="mt-4 space-y-3">
                    {DETAILS.map(([field, label]) => (
                      <div key={String(field)}>
                        <dt className="text-sm font-medium text-ink/50">{label}</dt>
                        <dd className="mt-1 text-[15px] text-ink/80">{String(scheme[field] ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                  {scheme.official_url ? (
                    <a
                      href={scheme.official_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-medium text-clay"
                    >
                      <ExternalLink className="size-4" /> Official website
                    </a>
                  ) : null}
                  {scheme.is_demo ? (
                    <p className="mt-2 text-xs text-ink/45">Sample entry for the demo — always check the official website.</p>
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