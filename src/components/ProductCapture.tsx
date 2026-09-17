import { useRef } from "react";
import { Camera, Images } from "lucide-react";

import sareeRaw from "@/assets/saree-raw.jpg";

type Props = {
  onCaptured: (image: string) => void;
};

/** Camera-first product photo step with a simple framing guide. */
export function ProductCapture({ onCaptured }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    onCaptured(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-5">
      <div className="glass p-5">
        <p className="text-lg text-ink">“Sure. Please show me the saree.”</p>
        <p className="mt-1 text-base text-ink/60">Hold the phone steady and keep the whole product in the frame.</p>
      </div>

      <div className="glass relative overflow-hidden p-5">
        <div className="relative grid aspect-4/3 place-items-center rounded-3xl bg-paper-2">
          <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-clay/50" />
          <p className="relative text-center text-base font-medium text-ink/60">
            Product here
            <span className="mt-1 block text-sm font-normal text-ink/50">Keep the product visible</span>
          </p>
        </div>

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
