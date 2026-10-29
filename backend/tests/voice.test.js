import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { calculateCostBasedPrice, parseCommand } from "../services/aiService.js";
import { synthesizeSpeech, transcribeAudio, translateText } from "../services/sarvamService.js";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.SARVAM_API_KEY;
const originalLlmKey = process.env.LLM_API_KEY;

beforeEach(() => {
  process.env.LLM_API_KEY = "";
  process.env.SARVAM_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.SARVAM_API_KEY;
  else process.env.SARVAM_API_KEY = originalApiKey;
  if (originalLlmKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = originalLlmKey;
});

test("routes natural English variations to artisan features", async () => {
  const cases = [
    ["Could you display the products in my catalog?", "VIEW_PRODUCTS"],
    ["List my product", "CREATE_PRODUCT"],
    ["Can I see the recorded sales so far?", "VIEW_SALES"],
    ["Find buyer enquiries for me", "VIEW_ENQUIRIES"],
    ["What price should I charge for my blue cotton saree?", "GET_PRICE_HELP"],
    ["Find sarees under 2000 rupees", "FIND_CATALOG"],
  ];

  for (const [text, expected] of cases) {
    const { result } = await parseCommand(text);
    assert.equal(result.intent, expected, text);
  }
});

test("keeps product-list requests distinct from buyer catalogue searches", async () => {
  const ownProducts = await parseCommand("Show me my products");
  const translatedOwnProducts = await parseCommand("Show me the approved products");
  const listedOwnProducts = await parseCommand("Display my listed products");
  const mySarees = await parseCommand("Show my sarees");
  const mySaree = await parseCommand("Show me my blue saree");
  const buyerCatalog = await parseCommand("Show me cotton sarees under 2000 rupees");
  const ownSales = await parseCommand("Show my sales");
  assert.equal(ownProducts.result.intent, "VIEW_PRODUCTS");
  assert.equal(translatedOwnProducts.result.intent, "VIEW_PRODUCTS");
  assert.equal(listedOwnProducts.result.intent, "VIEW_PRODUCTS");
  assert.equal(mySarees.result.intent, "VIEW_PRODUCTS");
  assert.equal(mySaree.result.intent, "VIEW_PRODUCTS");
  assert.equal(buyerCatalog.result.intent, "FIND_CATALOG");
  assert.equal(ownSales.result.intent, "VIEW_SALES");
});

test("transcribes the selected language using Saaras v4", async () => {
  let requestUrl = "";
  let requestBody;
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url);
    requestBody = options.body;
    return Response.json({ transcript: "నా ఉత్పత్తులను చూపించు" });
  };

  const transcript = await transcribeAudio(Buffer.from("audio"), "audio/webm;codecs=opus", "te");
  assert.equal(transcript, "నా ఉత్పత్తులను చూపించు");
  assert.equal(requestUrl, "https://api.sarvam.ai/speech-to-text");
  assert.equal(requestBody.get("model"), "saaras:v4");
  assert.equal(requestBody.get("mode"), "transcribe");
  assert.equal(requestBody.get("language_code"), "te-IN");
  assert.equal(requestBody.get("file").type, "audio/webm");
});

test("translates Telugu with Mayura and colloquial mode", async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({ translated_text: "Show my products" });
  };

  const translated = await translateText("నా ఉత్పత్తులను చూపించు", "te", "en");
  assert.equal(translated, "Show my products");
  assert.equal(requestBody.model, "mayura:v1");
  assert.equal(requestBody.mode, "modern-colloquial");
  assert.equal(requestBody.source_language_code, "te-IN");
  assert.equal(requestBody.target_language_code, "en-IN");
});

test("routes natural Telugu variations after translation", async () => {
  const translations = new Map([
    ["నా ఉత్పత్తులను చూపించు", "Show my products"],
    ["నా చీరలను చూపించు", "Show my sarees"],
    ["నా అమ్మకాల వివరాలు చూపించు", "Show my sales"],
    ["కొనుగోలుదారులను కనుగొనండి", "Find buyers"],
    ["నేను ఎంత ధర పెట్టాలి?", "How much should I charge?"],
    ["కొత్త ఉత్పత్తిని జాబితా చేయి", "Create a new product"],
  ]);
  globalThis.fetch = async (_url, options) => {
    const { input } = JSON.parse(options.body);
    return Response.json({ translated_text: translations.get(input) });
  };

  const cases = [
    ["నా ఉత్పత్తులను చూపించు", "VIEW_PRODUCTS"],
    ["నా చీరలను చూపించు", "VIEW_PRODUCTS"],
    ["నా అమ్మకాల వివరాలు చూపించు", "VIEW_SALES"],
    ["కొనుగోలుదారులను కనుగొనండి", "VIEW_ENQUIRIES"],
    ["నేను ఎంత ధర పెట్టాలి?", "GET_PRICE_HELP"],
    ["కొత్త ఉత్పత్తిని జాబితా చేయి", "CREATE_PRODUCT"],
  ];

  for (const [spoken, expected] of cases) {
    const translated = await translateText(spoken, "te", "en");
    const { result } = await parseCommand(translated);
    assert.equal(result.intent, expected, spoken);
  }
});

test("collects price-help follow-up details without dropping pending information", async () => {
  const firstAnswer = await parseCommand(
    "Pochampally silk saree; material cost 1200 rupees; 10 hours; 150 rupees per hour; 20% profit",
    {
      intent: "GET_PRICE_HELP",
      missingField: "productName",
      pricingDetails: {},
    },
  );
  assert.equal(firstAnswer.result.intent, "GET_PRICE_HELP");
  assert.deepEqual(firstAnswer.result.pricingDetails, {
    productName: "Pochampally silk saree",
    materialCost: 1200,
    hourlyRate: 150,
    laborHours: 10,
    profitPercent: 20,
  });

  const bareMaterialCost = await parseCommand("₹1,500", {
    intent: "GET_PRICE_HELP",
    missingField: "materialCost",
    pricingDetails: { productName: "Kanchipuram silk saree" },
  });
  assert.deepEqual(bareMaterialCost.result.pricingDetails, {
    productName: "Kanchipuram silk saree",
    materialCost: 1500,
  });

  assert.deepEqual(
    calculateCostBasedPrice({
      materialCost: 1200,
      laborCost: 10 * 150,
      extraCost: 0,
      profitPercent: 20,
    }),
    { productionCost: 2700, suggestedPrice: 3240 },
  );
});

test("transcribes the selected Indian English language", async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = options.body;
    return Response.json({ transcript: "Show my products" });
  };

  await transcribeAudio(Buffer.from("audio"), "audio/wav", "en");
  assert.equal(requestBody.get("language_code"), "en-IN");
});

test("generates Telugu audio using Bulbul v3 Shubh", async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({ audios: [Buffer.from("wav-audio").toString("base64")] });
  };

  const audio = await synthesizeSpeech("నమస్కారం", "te");
  assert.equal(audio.toString(), "wav-audio");
  assert.equal(requestBody.model, "bulbul:v3");
  assert.equal(requestBody.speaker, "shubh");
  assert.equal(requestBody.language_code, "te-IN");
});

test("generates Indian English audio using Bulbul v3 Shubh", async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({ audios: [Buffer.from("wav-audio").toString("base64")] });
  };

  await synthesizeSpeech("Hello, how can I help?", "en");
  assert.equal(requestBody.speaker, "shubh");
  assert.equal(requestBody.language_code, "en-IN");
});

test("reports Sarvam outages and missing credentials", async () => {
  globalThis.fetch = async () => Response.json({ error: "rate limit" }, { status: 429 });
  await assert.rejects(translateText("Hello", "en", "te"), {
    status: 502,
    message: /HTTP 429/,
  });

  delete process.env.SARVAM_API_KEY;
  await assert.rejects(translateText("Hello", "en", "te"), {
    status: 503,
    message: /SARVAM_API_KEY/,
  });
});
