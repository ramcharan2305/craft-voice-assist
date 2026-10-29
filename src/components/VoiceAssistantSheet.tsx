import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Volume2, X } from "lucide-react";

import { ErrorNotice } from "@/components/ErrorNotice";
import { Waveform } from "@/components/Waveform";
import { aiApi, type AiPending, type VoiceLanguage } from "@/api/aiApi";
import { useSpeech } from "@/hooks/use-speech";
import { useStore } from "@/lib/store";
import { uiText } from "@/lib/ui-text";

const EXAMPLES = [
  "List my blue cotton saree for 2500 rupees",
  "Show my products",
  "Show my orders",
  "What government schemes are available?",
  "Are there any upcoming exhibitions?",
  "I want to learn how to sell my products online",
];

const STATUS_TEXT: Record<Phase, Parameters<typeof uiText>[1]> = {
  listening: "assistantListening",
  transcribing: "assistantTranscribing",
  working: "assistantWorking",
  ask: "assistantAsk",
  done: "assistantDone",
  failed: "assistantFailed",
};

type Phase = "listening" | "transcribing" | "working" | "ask" | "done" | "failed";
const TELUGU_COMMANDS = [
  "నా ఉత్పత్తులను చూపించు",
  "నా అమ్మకాల వివరాలు చూపించు",
  "కొనుగోలుదారుల విచారణలను చూపించు",
  "నేను ఎంత ధర పెట్టాలి?",
  "కొత్త ఉత్పత్తిని జాబితా చేయి",
];

/**
 * The single assistant surface for the whole app.
 *
 * Voice and text both end up in the same place: `POST /api/ai/command`.
 * Voice is only a way of producing that text.
 */
export function VoiceAssistantSheet() {
  const {
    assistantOpen,
    closeAssistant,
    language,
    assistantSeed,
    setLanguage,
    refreshProducts,
    refreshOrders,
    refreshProfile,
    say,
    draft,
    patchDraft,
  } = useStore();
  const speech = useSpeech(language);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("listening");
  const [typed, setTyped] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [references, setReferences] = useState<Array<{ href: string; label: string }>>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [translationWarning, setTranslationWarning] = useState<string | null>(null);
  const pending = useRef<AiPending | null>(null);
  const navigationRequest = useRef(0);
  const [willNavigate, setWillNavigate] = useState(false);

  useEffect(() => {
    if (!assistantOpen) return;
    navigationRequest.current += 1;
    setPhase("listening");
    setTyped("");
    setQuestion(null);
    setReply(null);
    setReferences([]);
    setFailure(null);
    setTranslationWarning(null);
    setWillNavigate(false);
    pending.current = null;
    speech.reset();

    // A phrase chosen from a chip on another screen is sent straight away.
    if (assistantSeed) {
      void send(assistantSeed);
      return () => {
        navigationRequest.current += 1;
        speech.cancel();
      };
    }

    void speech.start();
    return () => {
      navigationRequest.current += 1;
      speech.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantOpen, assistantSeed]);

  // Speech finished on its own: send it straight to the backend.
  useEffect(() => {
    if (!assistantOpen || speech.listening || speech.transcribing || !speech.transcript) return;
    if (phase !== "listening" && phase !== "transcribing") return;
    void send(speech.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, speech.transcribing, speech.transcript]);

  useEffect(() => {
    if (assistantOpen && phase === "listening" && speech.transcribing) {
      setPhase("transcribing");
    }
  }, [assistantOpen, phase, speech.transcribing]);

  const send = useCallback(
    async (text: string) => {
      const input = text.trim();
      if (!input) return;

      speech.cancel();
      setPhase("working");
      setFailure(null);
      setTranslationWarning(null);

      try {
        const imageContext = draft.description
          ? {
              name: draft.name,
              description: draft.description,
              category: draft.category,
              craft: draft.craft,
              material: draft.materials,
              color: draft.color,
              suggestedPrice: draft.price,
              priceRangeLow: draft.priceLow,
              priceRangeHigh: draft.priceHigh,
              priceReason: draft.priceReason,
            }
          : null;
        const result = await aiApi.sendCommand(
          input,
          pending.current,
          imageContext ? null : draft.image,
          imageContext,
          language === "te" ? "te" : "en",
        );

        if (result.needsInput) {
          pending.current = result.pending ?? null;
          setTyped("");
          let localizedQuestion = result.question ?? "Please tell me a little more.";
          let voiceLanguage: VoiceLanguage = language === "te" ? "te" : "en";
          if (voiceLanguage === "te") {
            try {
              localizedQuestion = (await aiApi.translate(localizedQuestion, "te")).text;
            } catch (translationError) {
              voiceLanguage = "en";
              setTranslationWarning(
                `Telugu translation is unavailable; showing English. ${translationError instanceof Error ? translationError.message : ""}`.trim(),
              );
            }
          }
          setQuestion(localizedQuestion);
          setPhase("ask");
          void speech.speak(localizedQuestion, voiceLanguage);
          return;
        }

        if (result.intent === "CREATE_PRODUCT" && result.draft) {
          patchDraft({
            name: result.draft.name,
            description: result.draft.description,
            category: result.draft.category,
            craft: result.draft.craft,
            materials: result.draft.material,
            color: result.draft.color,
            price: result.draft.price,
            quantity: result.draft.quantity,
          });
        }

        pending.current = null;
        let message = result.message ?? "Done.";
        let voiceLanguage: VoiceLanguage = language === "te" ? "te" : "en";
        if (voiceLanguage === "te") {
          try {
            message = (await aiApi.translate(message, "te")).text;
          } catch (translationError) {
            voiceLanguage = "en";
            setTranslationWarning(
              `Telugu translation is unavailable; showing English. ${translationError instanceof Error ? translationError.message : ""}`.trim(),
            );
          }
        }
        setReply(message);
        const links: Array<{ href: string; label: string }> = [];
        if (
          result.data?.products?.length &&
          (result.intent === "FIND_CATALOG" || result.intent === "PRODUCT_INFO")
        )
          links.push({ href: "/user", label: "View approved products" });
        for (const scheme of result.data?.schemes ?? []) {
          if (/^https?:\/\//i.test(scheme.official_url))
            links.push({ href: scheme.official_url, label: scheme.name });
        }
        for (const item of result.data?.market?.items ?? result.data?.opportunities?.items ?? []) {
          if (/^https?:\/\//i.test(item.source))
            links.push({ href: item.source, label: item.product_category });
        }
        setReferences(links.slice(0, 5));
        setPhase("done");
        const voicePlayback = speech.speak(message, voiceLanguage);
        say(message);

        if (result.data?.products || result.removedId) void refreshProducts();
        if (result.data?.orders) void refreshOrders();
        if (result.intent === "CREATE_PRODUCT") void refreshProfile();

        if (result.navigate) {
          setWillNavigate(true);
          const request = ++navigationRequest.current;
          void voicePlayback.then(() => {
            if (navigationRequest.current !== request) return;
            closeAssistant();
            navigate({ to: result.navigate! });
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
        setFailure(message);
        setPhase("failed");
        void speech.speak("Something went wrong. Please try again.");
      }
    },
    [
      closeAssistant,
      draft.category,
      draft.color,
      draft.craft,
      draft.description,
      draft.image,
      draft.materials,
      draft.name,
      draft.price,
      draft.priceHigh,
      draft.priceLow,
      draft.priceReason,
      navigate,
      patchDraft,
      refreshOrders,
      refreshProducts,
      refreshProfile,
      say,
      speech,
      language,
    ],
  );

  if (!assistantOpen) return null;

  const heardText = speech.transcript || typed;
  const busy = phase === "working" || phase === "transcribing";
  const commandExamples = language === "te" ? TELUGU_COMMANDS : EXAMPLES;

  const listenAgain = () => {
    setPhase("listening");
    setReply(null);
    setFailure(null);
    setTranslationWarning(null);
    speech.reset();
    void speech.start();
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
          <h2 className="text-xl">{uiText(language, "assistantTitle")}</h2>
          <button
            onClick={() => {
              navigationRequest.current += 1;
              closeAssistant();
            }}
            aria-label="Close assistant"
            className="chip grid size-11 place-items-center"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink/60">
              {uiText(language, "assistantVoiceLanguage")}
            </p>
            <div className="mt-2 flex gap-2" role="group" aria-label="Voice language">
              <button
                type="button"
                aria-pressed={language === "te"}
                onClick={() => {
                  speech.reset();
                  setLanguage("te");
                }}
                className={`chip min-h-11 px-4 text-sm font-medium ${language === "te" ? "bg-clay text-white" : "text-ink"}`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                aria-pressed={language !== "te"}
                onClick={() => {
                  speech.reset();
                  setLanguage("en");
                }}
                className={`chip min-h-11 px-4 text-sm font-medium ${language !== "te" ? "bg-clay text-white" : "text-ink"}`}
              >
                English (India)
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              void speech.speak(
                language === "te"
                  ? "నమస్కారం. నేను హెచ్-కనెక్ట్ సహాయకుడిని."
                  : "Hello. I am your H-Connect assistant.",
              )
            }
            className="chip flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-clay"
          >
            <Volume2 className="size-4" />
            {speech.speaking
              ? uiText(language, "assistantPlaying")
              : uiText(language, "assistantPreview")}
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative grid place-items-center">
            <span className="halo absolute size-32 rounded-full bg-clay/30 blur-xl" />
            <span
              className={`relative grid size-24 place-items-center rounded-full text-white ${
                phase === "listening"
                  ? "bg-clay"
                  : phase === "failed"
                    ? "bg-destructive"
                    : "bg-sage"
              }`}
              aria-live="polite"
            >
              {busy ? (
                <Loader2 className="size-10 animate-spin" strokeWidth={1.6} />
              ) : phase === "failed" ? (
                <X className="size-10" strokeWidth={1.6} />
              ) : phase === "done" ? (
                <Volume2 className="size-10" strokeWidth={1.6} />
              ) : (
                <Mic className="size-10" strokeWidth={1.6} />
              )}
            </span>
          </div>

          <p
            className="mt-5 font-display text-2xl font-semibold"
            data-state={phase}
            data-testid="assistant-state"
          >
            {uiText(language, STATUS_TEXT[phase])}
          </p>
          {phase === "listening" && speech.supported ? <Waveform className="mt-3" /> : null}

          {phase === "ask" && question ? (
            <p className="mt-3 text-center text-lg text-ink">{question}</p>
          ) : heardText ? (
            <p
              className="mt-3 min-h-7 text-center text-lg text-ink"
              lang={language === "te" ? "te-IN" : "en-IN"}
            >
              {heardText}
            </p>
          ) : null}

          {phase === "done" && reply ? (
            <p
              className="mt-3 text-center text-xl text-ink"
              lang={language === "te" ? "te-IN" : "en-IN"}
            >
              {reply}
            </p>
          ) : null}
          {phase === "done" && reply ? (
            <button
              type="button"
              onClick={() => void speech.speak(reply, language === "te" ? "te" : "en")}
              className="chip mt-3 flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-clay"
            >
              <Volume2 className="size-4" />
              {speech.speaking
                ? uiText(language, "assistantPlaying")
                : uiText(language, "assistantReplay")}
            </button>
          ) : null}
          {translationWarning ? (
            <p role="status" className="mt-3 text-center text-sm text-ink/60">
              {translationWarning}
            </p>
          ) : null}
          {speech.error ? (
            <p role="alert" className="mt-3 text-center text-sm text-destructive">
              {speech.error}
            </p>
          ) : null}
          {phase === "done" && references.length ? (
            <div className="mt-4 flex w-full flex-col gap-2">
              {references.map((reference) => (
                <a
                  key={`${reference.href}-${reference.label}`}
                  href={reference.href}
                  target={reference.href.startsWith("/") ? undefined : "_blank"}
                  rel={reference.href.startsWith("/") ? undefined : "noreferrer"}
                  className="rounded-xl bg-white/60 px-4 py-3 text-sm font-medium text-clay underline"
                >
                  {reference.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {phase === "listening" ? (
          <div className="mt-4 flex flex-col gap-3">
            {speech.supported ? (
              <button
                onClick={speech.stop}
                disabled={speech.transcribing}
                className="min-h-14 w-full rounded-2xl bg-clay px-5 text-base font-semibold text-white"
              >
                {uiText(language, "assistantFinishRecording")}
              </button>
            ) : null}

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (typed.trim()) void send(typed);
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={uiText(language, "assistantTypeCommand")}
                aria-label={uiText(language, "assistantCommandLabel")}
                className="min-h-14 flex-1 rounded-2xl bg-white/70 px-4 text-base text-ink ring-1 ring-black/5 outline-none placeholder:text-ink/40"
              />
              <button className="min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white">
                {uiText(language, "assistantSend")}
              </button>
            </form>

            {language === "te" ? (
              <p className="text-center text-sm font-medium text-ink/60">
                {uiText(language, "assistantCommandHelp")}
              </p>
            ) : null}
            <div className="flex w-full flex-wrap justify-center gap-2">
              {commandExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    speech.cancel();
                    setTyped(example);
                    void send(example);
                  }}
                  className="chip px-4 py-2.5 text-[15px] font-medium text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "ask" ? (
          <div className="mt-4 flex flex-col gap-3">
            {speech.supported ? (
              <button
                onClick={listenAgain}
                className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-clay text-lg font-semibold text-white"
              >
                <Mic className="size-6" /> {uiText(language, "assistantSpeakAnswer")}
              </button>
            ) : null}
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (typed.trim()) void send(typed);
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={uiText(language, "assistantAnswerPlaceholder")}
                aria-label={uiText(language, "assistantAnswerLabel")}
                className="min-h-14 flex-1 rounded-2xl bg-white/70 px-4 text-base text-ink ring-1 ring-black/5 outline-none"
              />
              <button className="min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white">
                {uiText(language, "assistantAnswer")}
              </button>
            </form>
            <button
              onClick={() => {
                pending.current = null;
                setQuestion(null);
                setTyped("");
                listenAgain();
              }}
              className="chip min-h-14 w-full text-base font-medium text-ink"
            >
              {uiText(language, "assistantStartAgain")}
            </button>
          </div>
        ) : null}

        {phase === "failed" ? (
          <div className="mt-4">
            <ErrorNotice
              message={failure ?? "Something went wrong. Try again."}
              actionLabel="Try again"
              onAction={listenAgain}
            />
          </div>
        ) : null}

        {phase === "done" && !willNavigate ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                navigationRequest.current += 1;
                closeAssistant();
                navigate({ to: "/products" });
              }}
              className="min-h-14 flex-1 rounded-2xl bg-clay text-base font-semibold text-white"
            >
              {uiText(language, "assistantSeeProducts")}
            </button>
            <button
              onClick={() => {
                setTyped("");
                listenAgain();
              }}
              className="chip min-h-14 flex-1 text-base font-medium text-ink"
            >
              {uiText(language, "assistantSaySomethingElse")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
