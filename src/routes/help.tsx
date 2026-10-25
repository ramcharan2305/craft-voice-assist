import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "How to speak to your assistant — H Connect" },
      { name: "description", content: "Plain examples of what you can say to your craft assistant." },
    ],
  }),
  component: HelpPage,
});

const GROUPS = [
  {
    title: "Products",
    lines: [
      "List my blue cotton saree for 2500 rupees",
      "Show my products",
      "Change the saree price to 1800",
      "Remove the bamboo basket",
    ],
  },
  {
    title: "Business",
    lines: ["Show my orders", "What have I sold?"],
  },
  {
    title: "Help and information",
    lines: [
      "What government schemes are available?",
      "I want to learn how to sell my products online",
      "What is the market like for pottery?",
      "Help",
    ],
  },
];

function HelpPage() {
  const { openAssistant, openAssistantWith } = useStore();

  return (
    <AppShell>
      <h1 className="text-3xl">What you can say</h1>
      <p className="mt-2 text-base text-ink/60">Tap any line to try it, or tap the microphone and say it yourself.</p>

      <div className="mt-8 space-y-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-lg">{group.title}</h2>
            <div className="mt-4 space-y-2.5">
              {group.lines.map((line) => (
                <button
                  key={line}
                  onClick={() => openAssistantWith(line)}
                  className="chip w-full px-4 py-4 text-left text-base font-medium text-ink"
                >
                  “{line}”
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <button onClick={openAssistant} className="min-h-16 rounded-2xl bg-clay text-lg font-semibold text-white">
          Tap and speak
        </button>
        <Link to="/home" className="chip flex min-h-14 items-center justify-center text-base font-medium text-ink">
          Go home
        </Link>
      </div>
    </AppShell>
  );
}