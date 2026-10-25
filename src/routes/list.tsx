import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { aiApi, prepareImage } from "@/api/aiApi";
import { AIProcessing } from "@/components/AIProcessing";
import { AppShell } from "@/components/AppShell";
import { CatalogPreview } from "@/components/CatalogPreview";
import { ImageEnhancer } from "@/components/ImageEnhancer";
import { PricingAssistant } from "@/components/PricingAssistant";
import { ProductCapture } from "@/components/ProductCapture";
import { rupees } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/list")({
  head: () => ({
    meta: [
      { title: "Add a product — H Connect" },
      {
        name: "description",
        content: "Photograph your craft, check the listing and choose a price.",
      },
    ],
  }),
  component: ListProductPage,
});

type Step = "capture" | "enhance" | "catalog" | "price" | "saving";

function ListProductPage() {
  const { draft, patchDraft, resetDraft, addProduct, say, refreshProducts } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(() => (draft.name ? "catalog" : "capture"));
  const [failure, setFailure] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "ready" | "error">(
    "idle",
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const image = draft.image ?? "";
  const suggested = draft.price ?? 600;
  const marketLow = draft.priceLow ?? Math.max(50, Math.round(suggested * 0.75));
  const marketHigh = draft.priceHigh ?? Math.max(suggested + 50, Math.round(suggested * 1.4));
  const priceReason =
    draft.priceReason ||
    "Starting estimate. Adjust it to reflect your materials, time, and local buyers.";

  const analyzePhoto = async (source: string) => {
    patchDraft({
      image: source,
      enhanced: false,
      name: "",
      description: "",
      category: "",
      craft: "",
      color: "",
      materials: "",
      price: null,
      priceLow: null,
      priceHigh: null,
      priceReason: "",
    });
    setAnalysisState("analyzing");
    setAnalysisError(null);
    try {
      const preparedImage = await prepareImage(source);
      patchDraft({ image: preparedImage });
      if (source.startsWith("blob:")) URL.revokeObjectURL(source);
      const result = await aiApi.analyzeImage(preparedImage);
      patchDraft({
        name: result.name ?? "",
        description: result.description ?? "",
        category: result.category ?? "",
        craft: result.craft ?? "",
        color: result.color ?? "",
        materials: result.material ?? "",
        price: result.suggestedPrice,
        priceLow: result.priceRangeLow,
        priceHigh: result.priceRangeHigh,
        priceReason: result.priceReason ?? "",
      });
      setAnalysisState("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to analyze this photo.";
      setAnalysisError(message);
      setAnalysisState("error");
    }
  };

  const publish = async (price: number) => {
    setStep("saving");
    setFailure(null);
    try {
      const created = await addProduct({ ...draft, price });
      say(
        `${created.name} was submitted for approval. It will appear in the buyer catalogue after review.`,
      );
      resetDraft();
      void refreshProducts();
      navigate({ to: "/products" });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unable to save this product.");
      setStep("catalog");
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/products" })}
        className="chip inline-flex min-h-12 items-center gap-2 px-4 text-base font-medium text-ink"
      >
        <ArrowLeft className="size-5" /> My products
      </button>

      <div className="mt-5">
        {step === "capture" ? (
          <ProductCapture
            onCaptured={(file) => void analyzePhoto(file)}
            onManualEntry={() => setStep("catalog")}
            image={draft.image}
            analysisState={analysisState}
            analysisError={analysisError}
          />
        ) : null}

        {step === "enhance" ? (
          <ImageEnhancer
            before={image}
            onUse={(enhancedImage) => {
              patchDraft({ image: enhancedImage, enhanced: true });
              setStep("catalog");
            }}
            onKeepOriginal={() => {
              patchDraft({ enhanced: false });
              setStep("catalog");
            }}
          />
        ) : null}

        {step === "catalog" ? (
          <CatalogPreview draft={draft} onChange={patchDraft} onContinue={() => setStep("price")} />
        ) : null}

        {step === "price" ? (
          <PricingAssistant
            suggested={suggested}
            marketLow={marketLow}
            marketHigh={marketHigh}
            priceReason={priceReason}
            onAccept={(price) => void publish(price)}
          />
        ) : null}

        {step === "saving" ? (
          <AIProcessing
            title="Saving your product"
            steps={[
              { label: "Photo ready", state: "done" },
              { label: `Saving as ${draft.name || "your craft"}`, state: "active" },
              { label: "Adding it to the market", state: "waiting" },
            ]}
          />
        ) : null}
      </div>

      {image && step === "capture" ? (
        <button
          disabled={analysisState === "analyzing"}
          onClick={() => setStep("enhance")}
          className="mt-5 min-h-16 w-full rounded-2xl bg-clay text-lg font-semibold text-white"
        >
          {analysisState === "analyzing" ? "Analyzing your photo…" : "Improve the photo"}
        </button>
      ) : null}

      {image && step === "catalog" ? (
        <button
          onClick={() => setStep("enhance")}
          className="chip mt-4 min-h-12 w-full text-base font-medium text-ink"
        >
          Back to the photo
        </button>
      ) : null}

      {failure ? <p className="mt-4 text-base text-destructive">{failure}</p> : null}
      {step === "price" ? (
        <p className="mt-4 text-center text-sm text-ink/50">
          AI estimate {rupees(suggested)}. Review it before publishing.
        </p>
      ) : null}
    </AppShell>
  );
}
