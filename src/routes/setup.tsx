import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Mic, Square } from "lucide-react";

import { CraftBackdrop } from "@/components/AppShell";
import { Waveform } from "@/components/Waveform";
import { useSpeech } from "@/hooks/use-speech";
import { DEMO_ARTISAN } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Tell us about yourself — Kalaa Setu" },
      { name: "description", content: "Speak a sentence about your craft and the assistant fills in your profile." },
      { property: "og:title", content: "Tell us about yourself — Kalaa Setu" },
      { property: "og:description", content: "Speak a sentence about your craft and the assistant fills in your profile." },
    ],
  }),
  component: SetupPage,
});

const DEMO_SENTENCE = "నా పేరు లక్ష్మి. నేను చేనేత చీరలు తయారు చేస్తాను.";

function SetupPage() {
  const { language, artisan, setArtisan } = useStore();
  const speech = useSpeech(language);
  const navigate = useNavigate();
  const [heard, setHeard] = useState<string | null>(null);

  const understood = heard ? artisan : null;

  const finish = () => {
    setArtisan(DEMO_ARTISAN);
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen">
      <CraftBackdrop />
      <div className="relative mx-auto max-w-[44rem] px-5 py-12">
        <h1 className="text-3xl">Tell us about yourself.</h1>
        <p className="mt-2 text-base text-ink/60">Just speak one sentence — your name and what you make.</p>

        <div className="glass mt-8 flex flex-col items-center p-6">
          <button
            onClick={() => {
              if (speech.listening) {
                speech.stop();
                setHeard(speech.transcript || DEMO_SENTENCE);
                return;
              }
              setHeard(null);
              speech.start();
              if (!speech.supported) setHeard(DEMO_SENTENCE);
            }}
            aria-label={speech.listening ? "Stop speaking" : "Start speaking"}
            className="relative grid size-32 place-items-center rounded-full bg-clay text-white"
          >
            {speech.listening ? <Square className="size-12" /> : <Mic className="size-14" strokeWidth={1.6} />}
            {speech.listening ? <span className="halo absolute inset-0 rounded-full bg-clay/40" /> : null}
          </button>
          <p className="mt-4 text-lg font-medium">{speech.listening ? "Listening…" : "Tap and speak"}</p>
          {speech.listening ? <Waveform className="mt-2" /> : null}
          <p className="mt-3 min-h-8 text-center text-lg">{speech.transcript || heard}</p>
        </div>

        {understood ? (
          <div className="glass rise mt-6 p-6">
            <p className="text-sm font-medium text-ink/55">I understood</p>
            <dl className="mt-4 space-y-4 text-lg">
              <div>
                <dt className="text-sm text-ink/50">Name</dt>
                <dd className="font-display text-2xl font-semibold">{understood.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Craft</dt>
                <dd className="font-display text-2xl font-semibold">{understood.craft}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Place</dt>
                <dd className="font-display text-2xl font-semibold">{understood.location}</dd>
              </div>
            </dl>
            <button
              onClick={finish}
              className="mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
            >
              <Check className="size-6" /> Yes, that's me
            </button>
            <button
              onClick={() => {
                setHeard(null);
                speech.reset();
              }}
              className="chip mt-3 min-h-14 w-full text-base font-medium text-ink"
            >
              Say it again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
