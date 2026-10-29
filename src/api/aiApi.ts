import type { Order } from "./orderApi";
import type { Scheme } from "./schemeApi";
import type { TrainingResource } from "./trainingApi";
import type { MarketResponse } from "./marketApi";
import type { BuyerRequest } from "./buyerApi";
import type { Product } from "@/lib/mock-data";

import { apiFetch, apiFetchBlob } from "./client";

export type VoiceLanguage = "en" | "te";

export type AiIntent =
  | "CREATE_PRODUCT"
  | "VIEW_PRODUCTS"
  | "UPDATE_PRODUCT"
  | "DELETE_PRODUCT"
  | "VIEW_ORDERS"
  | "VIEW_SALES"
  | "VIEW_ENQUIRIES"
  | "GET_PRICE_HELP"
  | "FIND_SCHEMES"
  | "FIND_CATALOG"
  | "PRODUCT_INFO"
  | "FIND_OPPORTUNITIES"
  | "FIND_TRAINING"
  | "MARKET_INFO"
  | "GENERAL_QUESTION"
  | "UNKNOWN";

export type AiProduct = {
  name: string | null;
  description: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
  price: number | null;
  quantity: number | null;
};

export type ProductImageAnalysis = {
  name: string | null;
  description: string | null;
  category: string | null;
  craft: string | null;
  material: string | null;
  color: string | null;
  suggestedPrice: number | null;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  priceReason: string | null;
  confidence: "low" | "medium" | "high";
};

export type AiPending = {
  intent: AiIntent;
  product: AiProduct;
  productId?: string;
  missingField: string;
  pricingDetails?: {
    productName?: string;
    materialCost?: number;
    laborCost?: number;
    laborHours?: number;
    hourlyRate?: number;
    extraCost?: number;
    profitPercent?: number;
  };
};

export type AiCommandResponse = {
  intent: AiIntent;
  message?: string;
  speak?: string;
  navigate?: string;
  needsInput?: boolean;
  missingField?: string;
  question?: string;
  pending?: AiPending | null;
  needsConfirm?: boolean;
  removedId?: string;
  created?: Product;
  draft?: {
    name: string;
    description: string;
    category: string;
    craft: string;
    material: string;
    color: string;
    price: number;
    quantity: number;
  };
  source?: string;
  data?: {
    products?: Product[];
    orders?: Order[];
    enquiries?: BuyerRequest[];
    schemes?: Scheme[];
    training?: TrainingResource[];
    market?: MarketResponse;
    opportunities?: MarketResponse;
    pricing?: {
      productName: string;
      materialCost: number;
      laborCost: number;
      extraCost: number;
      productionCost: number;
      profitPercent: number;
      suggestedPrice: number;
    };
  };
};

/**
 * The single command endpoint used by both the microphone and the text box.
 * Voice is only a way of producing this text.
 */
export const aiApi = {
  sendCommand: async (
    text: string,
    pending?: AiPending | null,
    imageSource?: string | null,
    imageContext?: Partial<ProductImageAnalysis> | null,
    language: VoiceLanguage = "en",
  ) =>
    apiFetch<AiCommandResponse>("/ai/command", {
      method: "POST",
      body: JSON.stringify({
        text,
        pending: pending ?? null,
        language,
        image: imageSource ? await prepareImage(imageSource) : undefined,
        imageContext: imageContext ?? undefined,
      }),
    }),

  transcribe: (audio: Blob, language: VoiceLanguage) =>
    apiFetch<{ transcript: string }>(`/ai/speech-to-text?language=${language}`, {
      method: "POST",
      headers: { "Content-Type": audio.type || "audio/webm" },
      body: audio,
    }),

  translate: (text: string, language: VoiceLanguage) =>
    apiFetch<{ text: string }>("/ai/translate", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    }),

  speak: (text: string, language: VoiceLanguage) =>
    apiFetchBlob("/ai/speech", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    }),

  analyzeImage: async (imageSource: string) =>
    apiFetch<ProductImageAnalysis>("/ai/analyze-image", {
      method: "POST",
      body: JSON.stringify({ image: await prepareImage(imageSource) }),
    }),
};

export async function prepareImage(source: string): Promise<string> {
  if (source.startsWith("data:image/jpeg;base64,") && source.length <= 1_750_000) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("Couldn't open that photo. Please choose it again.");
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    throw new Error("This browser couldn't prepare the photo for analysis.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}
