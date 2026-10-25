import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const ACTIONS = ["Lifted the brightness", "Improved contrast", "Balanced the color"];

type Props = {
  before: string;
  onUse: (image: string) => void;
  onKeepOriginal: () => void;
};

/** Before / after slider so the artisan can see what changed. */
export function ImageEnhancer({ before, onUse, onKeepOriginal }: Props) {
  const [split, setSplit] = useState(50);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setEnhanced(null);
    setFailure(null);

    const image = new Image();
    image.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        setFailure("This browser couldn't enhance the photo.");
        return;
      }
      context.filter = "brightness(1.06) contrast(1.1) saturate(1.08)";
      context.drawImage(image, 0, 0);
      setEnhanced(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = () => setFailure("This photo couldn't be enhanced. You can keep the original.");
    image.src = before;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [before]);

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
              src={enhanced ?? before}
              alt="Enhanced product photo"
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

        {failure ? <p className="mt-3 text-sm text-destructive" role="status">{failure}</p> : null}
        {!enhanced && !failure ? <p className="mt-3 text-sm text-ink/60" aria-live="polite">Improving light and color…</p> : null}
        {enhanced ? (
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
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          disabled={!enhanced}
          onClick={() => enhanced && onUse(enhanced)}
          className="min-h-16 flex-1 rounded-2xl bg-clay text-lg font-semibold text-white disabled:opacity-50"
        >
          Use this image
        </button>
        <button onClick={onKeepOriginal} className="chip min-h-16 flex-1 text-base font-medium text-ink">
          Keep my original
        </button>
      </div>
    </div>
  );
}
