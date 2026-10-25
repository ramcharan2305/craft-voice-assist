import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Mic } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { trainingApi, type TrainingResource } from "@/api/trainingApi";
import { useResource } from "@/hooks/use-resource";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Training — H Connect" },
      { name: "description", content: "Short lessons on selling online, photography, pricing and social media." },
    ],
  }),
  component: TrainingPage,
});

function TrainingPage() {
  const { openAssistant } = useStore();
  const resource = useResource<TrainingResource[]>(() => trainingApi.getResources(), []);

  return (
    <AppShell>
      <h1 className="text-3xl">Learn to sell online</h1>
      <p className="mt-2 text-base text-ink/60">Say “I want to learn how to sell my products online.”</p>

      <button
        onClick={openAssistant}
        className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
      >
        <Mic className="size-6" /> Ask for a lesson
      </button>

      <div className="mt-8">
        <ResourceView
          resource={resource}
          isEmpty={(items) => items.length === 0}
          emptyTitle="No training resources yet"
          emptyDetail="Run the seed script in backend/ to load sample lessons."
        >
          {(items) => (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="glass flex flex-col p-5">
                  <span className="w-fit rounded-full bg-clay/12 px-3 py-1 text-xs font-medium text-clay">
                    {item.category}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold text-balance">{item.title}</h2>
                  <p className="mt-2 flex-1 text-base text-ink/65">{item.description}</p>
                  <p className="mt-3 text-sm text-ink/50">
                    {item.level} · {item.language}
                  </p>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-medium text-clay"
                    >
                      <ExternalLink className="size-4" /> Open the lesson
                    </a>
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