import { Mic, Square } from "lucide-react";

type Props = {
  listening?: boolean;
  onClick: () => void;
  label?: string;
};

/** The single most prominent control in the app. */
export function MicButton({ listening = false, onClick, label = "Tap and speak" }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={listening ? "Stop listening" : label}
      className="relative grid place-items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay rounded-full"
    >
      <span className="halo absolute size-56 rounded-full bg-clay/25 blur-2xl" />
      <span className="halo absolute size-56 rounded-full bg-clay/20 blur-2xl" style={{ animationDelay: "0.5s" }} />
      <span
        className={`relative grid size-52 place-items-center rounded-full bg-white/60 shadow-2xl shadow-clay/20 ring-1 ring-white/60 backdrop-blur-xl ${listening ? "" : "bob"}`}
      >
        <span className="grid size-40 place-items-center rounded-full bg-clay text-white shadow-lg shadow-clay/30 ring-1 ring-clay transition-transform active:scale-95">
          {listening ? <Square className="size-14" strokeWidth={1.6} /> : <Mic className="size-16" strokeWidth={1.6} />}
        </span>
      </span>
    </button>
  );
}
