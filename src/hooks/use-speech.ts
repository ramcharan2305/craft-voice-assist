import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

const getRecognition = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const LOCALES: Record<string, string> = {
  te: "te-IN",
  hi: "hi-IN",
  en: "en-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  mr: "mr-IN",
};

/**
 * Microphone listening with live transcript.
 * Falls back to a typed-in phrase when the browser has no speech engine,
 * so the whole voice journey still works for a demo.
 */
export function useSpeech(language = "en") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const ref = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => ref.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTranscript("");
    const Ctor = getRecognition();
    if (!Ctor) {
      setSupported(false);
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = LOCALES[language] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i]?.[0]?.transcript ?? "";
      }
      setTranscript(text.trim());
    };
    recognition.onerror = () => {
      setError("I couldn't hear you. Please try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    ref.current = recognition;
    recognition.start();
    setListening(true);
  }, [language]);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  /** Speaks a short reply out loud when the device supports it. */
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALES[language] ?? "en-IN";
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [language],
  );

  return { listening, transcript, setTranscript, error, supported, start, stop, reset, speak };
}
