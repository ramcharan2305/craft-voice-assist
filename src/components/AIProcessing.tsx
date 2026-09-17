import { Check } from "lucide-react";

export type Step = { label: string; state: "done" | "active" | "waiting" };

export function AIProcessing({ title = "AI is working", steps }: { title?: string; steps: Step[] }) {
  return (
    <section className="glass rise p-5" aria-live="polite">
      <h2 className="text-lg">{title}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 text-[15px] ${
              step.state === "done" ? "text-ink/70" : step.state === "active" ? "font-medium text-ink" : "text-ink/40"
            }`}
          >
            {step.state === "done" ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sage text-white">
                <Check className="size-4" strokeWidth={3} />
              </span>
            ) : (
              <span
                className={`size-6 shrink-0 rounded-full border-2 ${
                  step.state === "active" ? "animate-pulse border-clay/60 bg-clay/20" : "border-ink/15"
                }`}
              />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
