import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { CraftBackdrop } from "@/components/AppShell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Choose your language — H Connect" },
      { name: "description", content: "Pick the language you want to speak to your craft assistant in." },
      { property: "og:title", content: "Choose your language — H Connect" },
      { property: "og:description", content: "Pick the language you want to speak to your craft assistant in." },
    ],
  }),
  component: LanguagePage,
});

function LanguagePage() {
  const { language, setLanguage } = useStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <CraftBackdrop />
      <div className="relative mx-auto max-w-[44rem] px-5 py-12">
        <h1 className="text-3xl">Choose your language</h1>
        <p className="mt-2 text-base text-ink/60">Tap the speaker to hear each one.</p>

        <div className="mt-8">
          <LanguageSelector value={language} onSelect={setLanguage} />
        </div>

        <button
          onClick={() => navigate({ to: "/setup" })}
          className="mt-8 min-h-16 w-full rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          Continue
        </button>
        <Link to="/home" className="mt-3 block min-h-12 pt-3 text-center text-base font-medium text-clay">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
