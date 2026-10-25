import { useRef } from "react";
import { Camera, Images } from "lucide-react";

import sareeRaw from "@/assets/saree-raw.jpg";

type Props = {
  onCaptured: (image: string) => void;
  onManualEntry: () => void;
  image?: string | null;
  analysisState?: "idle" | "analyzing" | "ready" | "error";
  analysisError?: string | null;
};

/** Camera-first product photo step with a simple framing guide. */
export function ProductCapture({
  onCaptured,
  onManualEntry,
  image,
  analysisState = "idle",
  analysisError,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    onCaptured(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-5">
      <div className="glass p-5">
        <p className="text-lg text-ink">“Sure. Please show me the saree.”</p>
        <p className="mt-1 text-base text-ink/60">
          Hold the phone steady and keep the whole product in the frame.
        </p>
      </div>

      <div className="glass relative overflow-hidden p-5">
        <div className="relative grid aspect-4/3 place-items-center rounded-3xl bg-paper-2">
          {image ? (
            <img
              src={image}
              alt="Selected product"
              className="absolute inset-0 size-full rounded-3xl object-contain"
            />
          ) : null}
          <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-clay/50" />
          {!image ? (
            <p className="relative text-center text-base font-medium text-ink/60">
              Product here
              <span className="mt-1 block text-sm font-normal text-ink/50">
                Keep the product visible
              </span>
            </p>
          ) : null}
        </div>

        {analysisState === "analyzing" ? (
          <p className="mt-4 text-center text-base text-ink/60" aria-live="polite">
            Looking at the details in your photo…
          </p>
        ) : null}
        {analysisState === "ready" ? (
          <p className="mt-4 text-center text-base text-ink/60" aria-live="polite">
            Product details and an approximate price are ready.
          </p>
        ) : null}
        {analysisState === "error" ? (
          <p className="mt-4 text-center text-base text-destructive" role="status">
            {analysisError}
          </p>
        ) : null}

        <button
          onClick={() => fileRef.current?.click()}
          className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          <Camera className="size-6" /> Take a photo
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="chip mt-3 flex min-h-14 w-full items-center justify-center gap-2 text-base font-medium text-ink"
        >
          <Images className="size-5" /> Choose from gallery
        </button>
        <button
          onClick={() => onCaptured(sareeRaw)}
          className="mt-3 min-h-12 w-full text-sm font-medium text-clay underline"
        >
          Use the demo photo instead
        </button>
        <button
          onClick={onManualEntry}
          className="mt-2 min-h-12 w-full text-sm font-medium text-ink/65 underline"
        >
          Enter product details without a photo
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
