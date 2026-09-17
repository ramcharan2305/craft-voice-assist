import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, Volume2, X } from "lucide-react";

import { Waveform } from "@/components/Waveform";
import { ErrorNotice } from "@/components/ErrorNotice";
import { useSpeech } from "@/hooks/use-speech";
import { INTENT_LABEL, parseIntent, type Intent } from "@/lib/intents";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

const EXAMPLES = [
  "List my new product",
  "Show my products",
  "Change the saree price to 1500",
  "Find buyers for my baskets",
  "What have I sold?",
];

type Phase = "listening" | "heard" | "confirm" | "done" | "failed";

export function VoiceAssistantSheet() {
  const { assistantOpen, closeAssistant, language, findProduct, updateProduct, setProductStatus, say } = useStore();
  const speech = useSpeech(language);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("listening");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!assistantOpen) return;
    setPhase("listening");
    setIntent(null);
    setTyped("");
    speech.reset();
    speech.start();
    return () => speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantOpen]);

  useEffect(() => {
    if (assistantOpen && !speech.listening && speech.transcript && phase === "listening") {
      setPhase("heard");
    }
  }, [assistantOpen, speech.listening, speech.transcript, phase]);

  if (!assistantOpen) return null;

  const heardText = speech.transcript || typed;

  const run = (parsed: Intent) => {
    if (parsed.name === "UPDATE_PRODUCT" && parsed.price) {
      const product = findProduct(parsed.target);
      if (product) {
        updateProduct(product.id, { price: parsed.price });
        say(`${product.name} now costs ${rupees(parsed.price)}.`);
      }
    }
    if (parsed.name === "UNLIST_PRODUCT") {
      const product = findProduct(parsed.target);
      if (product) {
        setProductStatus(product.id, "draft");
        say(`${product.name} is removed from the market.`);
      }
    }
    speech.speak(parsed.reply);
    setPhase("done");
    if (parsed.to) navigate({ to: parsed.to });
    window.setTimeout(closeAssistant, 900);
  };

  const understand = (text: string) => {
    const parsed = parseIntent(text);
    setIntent(parsed);
    if (parsed.name === "UNKNOWN") {
      setPhase("failed");
      return;
    }
    if (parsed.needsConfirm) {
      setPhase("confirm");
      speech.speak(parsed.reply);
      return;
    }
    run(parsed);
  };

  const retry = () => {
    setIntent(null);
    setTyped("");
    speech.reset();
    setPhase("listening");
    speech.start();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        aria-label="AI assistant"
        className="sheet-up glass-strong w-full max-w-[44rem] p-6 pb-8 sm:mb-6 sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Your assistant</h2>
          <button onClick={closeAssistant} aria-label="Close assistant" className="chip grid size-11 place-items-center">
            <X className="size-5" />
          </button>
        </div>

        {phase === "listening" ? (
          <div className="mt-6 flex flex-col items-center">
            <div className="relative grid place-items-center">
              <span className="halo absolute size-32 rounded-full bg-clay/30 blur-xl" />
              <span className="relative grid size-24 place-items-center rounded-full bg-clay text-white">
                <Mic className="size-10" strokeWidth={1.6} />
              </span>
            </div>
            <p className="mt-5 font-display text-2xl font-semibold">
              {speech.supported ? "Listening…" : "Type what you want"}
            </p>
            {speech.supported ? <Waveform className="mt-3" /> : null}
            <p className="mt-3 min-h-7 text-center text-lg text-ink">{speech.transcript}</p>

            {speech.supported ? (
              <button
                onClick={speech.stop}
                className="mt-4 min-h-14 w-full rounded-2xl bg-clay px-5 text-base font-semibold text-white"
              >
                I'm done speaking
              </button>
            ) : (
              <form
                className="mt-4 w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) setPhase("heard");
                }}
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="List my new saree"
                  aria-label="What would you like to do?"
                  className="min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base text-ink ring-1 ring-black/5 outline-none placeholder:text-ink/40"
                />
                <button className="mt-3 min-h-14 w-full rounded-2xl bg-clay text-base font-semibold text-white">
                  Continue
                </button>
              </form>
            )}

            <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    speech.stop();
                    speech.setTranscript(example);
                    setPhase("heard");
                  }}
                  className="chip px-4 py-2.5 text-[15px] font-medium text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "heard" ? (
          <div className="mt-6">
            <p className="text-sm font-medium text-ink/55">I heard</p>
            <p className="mt-2 rounded-2xl bg-paper-2/70 px-4 py-4 text-lg text-ink">“{heardText}”</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => understand(heardText)}
                className="min-h-14 flex-1 rounded-2xl bg-clay text-base font-semibold text-white"
              >
                Yes, that's right
              </button>
              <button onClick={retry} className="chip min-h-14 flex-1 text-base font-medium text-ink">
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {phase === "confirm" && intent ? (
          <div className="mt-6">
            <p className="text-sm font-medium text-ink/55">{INTENT_LABEL[intent.name]}</p>
            <p className="mt-2 text-xl text-ink">{intent.reply}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => run(intent)}
                className={`min-h-14 flex-1 rounded-2xl text-base font-semibold text-white ${intent.name === "UNLIST_PRODUCT" ? "bg-destructive" : "bg-clay"}`}
              >
                Confirm
              </button>
              <button onClick={retry} className="chip min-h-14 flex-1 text-base font-medium text-ink">
                Change
              </button>
            </div>
          </div>
        ) : null}

        {phase === "done" && intent ? (
          <div className="mt-6 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage/15 text-sage">
              <Volume2 className="size-5" />
            </span>
            <p className="text-xl text-ink">{intent.reply}</p>
          </div>
        ) : null}

        {phase === "failed" ? (
          <div className="mt-6">
            <ErrorNotice
              message={speech.error ?? "I couldn't understand that. Please try again."}
              actionLabel="Speak again"
              onAction={retry}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
