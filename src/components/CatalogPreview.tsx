import { useEffect, useState } from "react";
import { Mic, Pencil } from "lucide-react";

import { useStore } from "@/lib/store";
import { useSpeech } from "@/hooks/use-speech";
import type { Draft } from "@/lib/store";

type Props = {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onContinue: () => void;
};

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "category", label: "Category" },
  { key: "craft", label: "Craft" },
  { key: "color", label: "Colour" },
  { key: "materials", label: "Materials" },
  { key: "price", label: "Price (₹)" },
  { key: "quantity", label: "Available quantity" },
] as const;

export function CatalogPreview({ draft, onChange, onContinue }: Props) {
  const { openAssistant, language } = useStore();
  const speech = useSpeech(language);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    if (speech.transcript) onChange({ description: speech.transcript });
  }, [speech.transcript, onChange]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">I've prepared your product listing.</h1>
        <p className="mt-2 text-base text-ink/60">
          Photo-based details are estimates. Please check them before publishing.
        </p>
      </div>

      <article className="glass overflow-hidden">
        {draft.image ? (
          <img src={draft.image} alt={draft.name} className="aspect-square w-full object-cover" />
        ) : null}
        <div className="p-5">
          <h2 className="text-2xl">{draft.name}</h2>
          <p className="mt-2 text-base text-ink/65">{draft.description}</p>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">Category</dt>
              <dd className="font-medium">{draft.category}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">Craft</dt>
              <dd className="font-medium">{draft.craft}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">Colour</dt>
              <dd className="font-medium">{draft.color}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/50">Materials</dt>
              <dd className="font-medium">{draft.materials}</dd>
            </div>
          </dl>
        </div>
      </article>

      {editing ? (
        <div className="glass space-y-4 p-5">
          {FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="text-sm font-medium text-ink/60">{field.label}</span>
              {field.key === "description" ? (
                <>
                  <textarea
                    value={draft.description}
                    onChange={(event) => onChange({ description: event.target.value })}
                    rows={4}
                    className="mt-1 min-h-24 w-full rounded-2xl bg-white/70 px-4 py-3 text-base ring-1 ring-black/5 outline-none"
                  />
                  {speech.supported ? (
                    <button
                      type="button"
                      disabled={speech.transcribing}
                      onClick={() => (speech.listening ? speech.stop() : speech.start())}
                      className="chip mt-2 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-clay"
                    >
                      <Mic className="size-4" />{" "}
                      {speech.listening
                        ? "Stop dictating"
                        : speech.transcribing
                          ? "Transcribing…"
                          : "Dictate description"}
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-ink/50">
                      Voice input is unavailable here; type the description above.
                    </p>
                  )}
                  {speech.error ? (
                    <p className="mt-2 text-sm text-destructive">{speech.error}</p>
                  ) : null}
                </>
              ) : (
                <input
                  type={field.key === "price" || field.key === "quantity" ? "number" : "text"}
                  min={field.key === "price" || field.key === "quantity" ? 0 : undefined}
                  step={field.key === "price" ? "0.01" : field.key === "quantity" ? "1" : undefined}
                  value={draft[field.key] ?? ""}
                  onChange={(event) => {
                    if (field.key === "price")
                      onChange({ price: event.target.value ? Number(event.target.value) : null });
                    else if (field.key === "quantity")
                      onChange({ quantity: Number(event.target.value) });
                    else if (field.key === "name") onChange({ name: event.target.value });
                    else if (field.key === "category") onChange({ category: event.target.value });
                    else if (field.key === "craft") onChange({ craft: event.target.value });
                    else if (field.key === "color") onChange({ color: event.target.value });
                    else onChange({ materials: event.target.value });
                  }}
                  className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
                />
              )}
            </label>
          ))}
          <button
            onClick={() => setEditing(false)}
            className="chip min-h-14 w-full text-base font-medium text-ink"
          >
            Done editing
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onContinue}
          className="min-h-16 flex-1 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          Looks correct
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="chip flex min-h-16 flex-1 items-center justify-center gap-2 text-base font-medium text-ink"
        >
          <Pencil className="size-5" /> Change something
        </button>
        <button
          onClick={openAssistant}
          className="chip flex min-h-16 items-center justify-center gap-2 px-5 text-base font-medium text-clay"
        >
          <Mic className="size-5" /> Say it
        </button>
      </div>
    </div>
  );
}
