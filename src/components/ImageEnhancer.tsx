import { useState } from "react";
import { Check } from "lucide-react";

const ACTIONS = ["Cleaned the background", "Improved the lighting", "Straightened the framing", "Sharpened the details"];

type Props = {
  before: string;
  after: string;
  onUse: () => void;
  onKeepOriginal: () => void;
};

/** Before / after slider so the artisan can see what changed. */
export function ImageEnhancer({ before, after, onUse, onKeepOriginal }: Props) {
  const [split, setSplit] = useState(50);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Let's make your product look ready for the market.</h1>
        <p className="mt-2 text-base text-ink/60">Drag the slider to compare your photo with the cleaned one.</p>
      </div>

      <div className="glass overflow-hidden p-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-paper-2">
          <img src={before} alt="Your original photo" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
            <img
              src={after}
              alt="Cleaned product photo"
              className="absolute inset-0 h-full w-[100vw] max-w-none object-cover"
              style={{ width: `${(100 / Math.max(split, 1)) * 100}%` }}
            />
          </div>
          <span className="absolute top-3 left-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold text-white">
            After
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink">
            Before
          </span>
          <span
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90"
            style={{ left: `${split}%` }}
            aria-hidden
          />
        </div>

        <input
          type="range"
          min={5}
          max={95}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          aria-label="Compare before and after"
          className="mt-5 h-11 w-full accent-clay"
        />

        <ul className="mt-3 space-y-2">
          {ACTIONS.map((action) => (
            <li key={action} className="flex items-center gap-3 text-[15px] text-ink/70">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sage text-white">
                <Check className="size-4" strokeWidth={3} />
              </span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={onUse} className="min-h-16 flex-1 rounded-2xl bg-clay text-lg font-semibold text-white">
          Use this image
        </button>
        <button onClick={onKeepOriginal} className="chip min-h-16 flex-1 text-base font-medium text-ink">
          Keep my original
        </button>
      </div>
    </div>
  );
}
