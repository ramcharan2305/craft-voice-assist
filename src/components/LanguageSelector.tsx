import { Check, Volume2 } from "lucide-react";

import { LANGUAGES, type LanguageId } from "@/lib/mock-data";

type Props = {
  value: LanguageId;
  onSelect: (id: LanguageId) => void;
};

export function LanguageSelector({ value, onSelect }: Props) {
  const speak = (name: string, id: LanguageId) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(name);
    utterance.lang = `${id}-IN`;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LANGUAGES.map((language) => {
        const selected = value === language.id;
        return (
          <div
            key={language.id}
            className={`glass flex items-center gap-4 p-5 ${selected ? "ring-2 ring-clay" : ""}`}
          >
            <button onClick={() => onSelect(language.id)} className="flex-1 text-left">
              <span className="block font-display text-2xl font-semibold">{language.native}</span>
              <span className="mt-1 block text-sm text-ink/55">{language.name}</span>
            </button>
            {selected ? (
              <span className="grid size-11 place-items-center rounded-full bg-sage text-white">
                <Check className="size-5" strokeWidth={3} />
              </span>
            ) : null}
            <button
              onClick={() => speak(language.native, language.id)}
              aria-label={`Hear ${language.name}`}
              className="chip grid size-12 place-items-center text-clay"
            >
              <Volume2 className="size-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
