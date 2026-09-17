import { useState } from "react";
import { Mic, Pencil } from "lucide-react";

import { useStore } from "@/lib/store";
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
] as const;

export function CatalogPreview({ draft, onChange, onContinue }: Props) {
  const { openAssistant } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">I've prepared your product listing.</h1>
        <p className="mt-2 text-base text-ink/60">Say “change the name” or tap edit if something is wrong.</p>
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
              <input
                value={draft[field.key]}
                onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<Draft>)}
                className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
              />
            </label>
          ))}
          <button onClick={() => setEditing(false)} className="chip min-h-14 w-full text-base font-medium text-ink">
            Done editing
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={onContinue} className="min-h-16 flex-1 rounded-2xl bg-clay text-lg font-semibold text-white">
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
