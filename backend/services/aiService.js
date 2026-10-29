/**
 * The AI layer of H-Connect has exactly one job: turn a sentence into a
 * structured intent. It never touches the database.
 *
 * When LLM_API_KEY is missing (or the call fails) a deterministic keyword
 * parser is used instead, so the whole voice demo still works offline.
 */

const INTENTS = [
  "CREATE_PRODUCT",
  "VIEW_PRODUCTS",
  "UPDATE_PRODUCT",
  "DELETE_PRODUCT",
  "VIEW_ORDERS",
  "VIEW_SALES",
  "VIEW_ENQUIRIES",
  "GET_PRICE_HELP",
  "FIND_SCHEMES",
  "FIND_CATALOG",
  "PRODUCT_INFO",
  "FIND_OPPORTUNITIES",
  "FIND_TRAINING",
  "MARKET_INFO",
  "GENERAL_QUESTION",
  "UNKNOWN",
];

const SYSTEM_PROMPT = `You are the command parser for H-Connect, a voice assistant for artisans.

Convert the user's request into JSON. Allowed intents:
${INTENTS.join("\n")}

Return ONLY valid JSON, with no extra text or markdown.

Shapes:
{
  "intent": "CREATE_PRODUCT",
  "product": { "name": null, "description": null, "category": null, "material": null, "color": null, "price": null, "quantity": null },
  "target": null,
  "price": null,
  "quantity": null,
  "query": null
}

Rules:
- Never invent information. Use null for anything the user did not say.
- "name" must be just the product, in Title Case, with no price, quantity or filler words.
  Example: "list my blue cotton saree for 2500 rupees" -> "Blue Cotton Saree".
- "price" is a number. Read it from any phrasing: "for 2500 rupees", "at 2500", "to 2000", "2500 rs".
- "quantity" is a number, and spoken number words become digits ("five" -> 5).
- "target" is the product being updated or deleted, without the words change, price, remove or delete.
- "query" is the craft, category or topic the user is asking about (schemes, training, market).
- Use FIND_CATALOG for requests to search buyer-visible products, and PRODUCT_INFO when someone asks for details about a named product.
- Use VIEW_PRODUCTS for the artisan's own listings, VIEW_SALES for recorded order/sales data, and VIEW_ENQUIRIES for buyer requests.
- Use GET_PRICE_HELP for questions about what to charge. Never invent or estimate a price without reliable product or pricing data.
- A request to list/add/create a product is CREATE_PRODUCT; a request to list/show existing products is VIEW_PRODUCTS.
- Use FIND_OPPORTUNITIES for exhibitions, events, and other market opportunities. Do not create or infer opportunity details.
- If a previous step is pending, merge the new information into it. A bare answer such as "five" fills in the pending quantity.
- Use GENERAL_QUESTION for greetings, help and anything you cannot map to the intents above.
- If nothing matches, use UNKNOWN.

Examples:
"list my blue cotton saree for 2500 rupees"
-> {"intent":"CREATE_PRODUCT","product":{"name":"Blue Cotton Saree","description":null,"category":"Saree","material":"Cotton","color":"Blue","price":2500,"quantity":null},"target":null,"price":null,"quantity":null,"query":null}

"change the price of my red silk saree to 2000"
-> {"intent":"UPDATE_PRODUCT","product":{},"target":"red silk saree","price":2000,"quantity":null,"query":null}

"remove the teak elephant"
-> {"intent":"DELETE_PRODUCT","product":{},"target":"teak elephant","price":null,"quantity":null,"query":null}`;

function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Strips code fences and finds the first JSON object in a model reply. */
function extractJson(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normaliseProduct(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    name: clean(p.name),
    description: clean(p.description),
    category: clean(p.category),
    material: clean(p.material),
    color: clean(p.color),
    price: toNumber(p.price),
    quantity: toNumber(p.quantity),
  };
}

function normaliseResult(raw) {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const intent = INTENTS.includes(parsed.intent) ? parsed.intent : "UNKNOWN";
  const product = normaliseProduct(parsed.product);
  // Models sometimes put the new price or the product name in the wrong slot.
  const price = toNumber(parsed.price) ?? product.price;
  return {
    intent,
    product,
    target: clean(parsed.target) ?? product.name,
    price,
    quantity: toNumber(parsed.quantity) ?? product.quantity,
    query: clean(parsed.query),
  };
}

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
};

function spokenNumber(text) {
  const lower = text.toLowerCase();
  const digits = lower.match(/\d+/);
  if (digits) return Number(digits[0]);
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return value;
  }
  return null;
}

const has = (text, words) => words.some((word) => text.includes(word));

function pricingNumber(text, labels) {
  const labelPattern = labels.join("|");
  const match = text.match(
    new RegExp(`(?:${labelPattern})[^\\d]{0,30}(?:₹\\s*|rs\\.?\\s*)?([\\d,]+(?:\\.\\d+)?)`, "i"),
  );
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function collectPricingDetails(text, current = {}) {
  const next = { ...current };
  const materialCost = pricingNumber(text, [
    "material(?:s)?(?:\\s+cost)?",
    "fabric(?:\\s+cost)?",
    "cloth(?:\\s+cost)?",
  ]);
  const laborCost = pricingNumber(text, [
    "(?:total\\s+)?labor(?:u)?r?\\s+cost",
    "stitching\\s+cost",
    "work(?:ing)?\\s+cost",
  ]);
  const hourlyText = text.match(
    /(?:₹\s*)?([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?)?\s*(?:\/|per)\s*hour/i,
  )?.[1];
  const hourlyRate =
    pricingNumber(text, ["hourly\\s+rate", "rate\\s+per\\s+hour"]) ??
    (hourlyText ? Number(hourlyText.replace(/,/g, "")) : null);
  const laborHours = Number(text.match(/([\d.]+)\s*(?:hours?|hrs?)(?!\s*per)/i)?.[1] ?? NaN);
  const extraCost = pricingNumber(text, [
    "packaging(?:\\s+cost)?",
    "other\\s+costs?",
    "additional\\s+costs?",
  ]);
  const profitMatch =
    text.match(/(?:profit|markup|margin)[^\d]{0,20}([\d.]+)\s*(?:%|percent)?/i) ??
    text.match(/([\d.]+)\s*(?:%|percent)\s*(?:profit|markup|margin)?/i);
  const profitPercent = profitMatch ? Number(profitMatch[1]) : null;
  const bareAmountMatch = text.match(
    /^\s*(?:₹\s*|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(?:rupees?)?\s*$/i,
  );
  const bareAmount = bareAmountMatch ? Number(bareAmountMatch[1].replace(/,/g, "")) : null;
  const firstAmountMatch = text.match(/(?:₹\s*|rs\.?\s*)?([\d,]+(?:\.\d+)?)/i);
  const firstAmount = firstAmountMatch ? Number(firstAmountMatch[1].replace(/,/g, "")) : null;

  if (materialCost !== null && Number.isFinite(materialCost)) next.materialCost = materialCost;
  if (laborCost !== null && Number.isFinite(laborCost)) next.laborCost = laborCost;
  if (hourlyRate !== null && Number.isFinite(hourlyRate)) next.hourlyRate = hourlyRate;
  if (Number.isFinite(laborHours) && laborHours > 0) next.laborHours = laborHours;
  if (extraCost !== null && Number.isFinite(extraCost)) next.extraCost = extraCost;
  if (profitPercent !== null && Number.isFinite(profitPercent)) next.profitPercent = profitPercent;
  if (bareAmount !== null) {
    if (current.missingField === "materialCost") next.materialCost = bareAmount;
    if (current.missingField === "laborCost") next.laborCost = bareAmount;
    if (current.missingField === "profitPercent") next.profitPercent = bareAmount;
  }
  if (firstAmount !== null && Number.isFinite(firstAmount)) {
    if (current.missingField === "materialCost" && next.materialCost === undefined) {
      next.materialCost = firstAmount;
    }
    if (
      current.missingField === "laborCost" &&
      next.laborCost === undefined &&
      !(next.laborHours > 0 && next.hourlyRate > 0)
    ) {
      next.laborCost = firstAmount;
    }
    if (current.missingField === "profitPercent" && next.profitPercent === undefined) {
      next.profitPercent = firstAmount;
    }
  }

  const productDescription = text
    .split(
      /\b(?:material(?:s)?(?:\s+cost)?|fabric(?:\s+cost)?|cloth(?:\s+cost)?|labor|labour|hourly|profit|markup|margin|packaging)\b/i,
    )[0]
    .replace(
      /^[\s,;]*(?:(?:my|the|this)\s+)?(?:(?:product|model)\s+(?:is|named)\s+|it is\s+|it’s\s+)?(?:a|an)\s+/i,
      "",
    )
    .replace(/[\s,;]+$/g, "")
    .trim();
  if (productDescription && !/\d/.test(productDescription) && productDescription.length <= 80) {
    next.productName = productDescription;
  }

  delete next.missingField;
  return next;
}

export function calculateCostBasedPrice({ materialCost, laborCost, extraCost = 0, profitPercent }) {
  const productionCost = materialCost + laborCost + extraCost;
  return {
    productionCost,
    suggestedPrice: Math.ceil(productionCost * (1 + profitPercent / 100)),
  };
}

/**
 * Offline intent parser. Deliberately simple and predictable: it is the safety
 * net when no LLM key is configured.
 */
function parseLocally(text, pending) {
  const lower = text.toLowerCase().trim();

  if (has(lower, ["tell me about", "details about", "describe this", "product details"])) {
    return {
      intent: "PRODUCT_INFO",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  if (has(lower, ["exhibition", "exhibitions", "opportunit", "trade fair", "trade show"])) {
    return {
      intent: "FIND_OPPORTUNITIES",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  const ownProductRequest =
    has(lower, [
      "my product",
      "my listing",
      "my catalog",
      "my catalogue",
      "products i have",
      "my own",
    ]) ||
    (has(lower, ["show", "display", "view", "see", "list"]) &&
      has(lower, ["approved product", "listed product"])) ||
    (/\b(?:show|display|view|see)\b/.test(lower) &&
      /\bmy\b/.test(lower) &&
      !has(lower, [
        "sale",
        "sales",
        "revenue",
        "order",
        "orders",
        "buyer",
        "buyers",
        "enquiry",
        "enquiries",
        "price",
        "charge",
        "income",
      ]));
  if (ownProductRequest) {
    return {
      intent: "VIEW_PRODUCTS",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    (has(lower, ["find", "search", "show me", "look for", "browse"]) &&
      !has(lower, ["my products", "my product", "my catalog", "my catalogue", "products i have"]) &&
      has(lower, [
        "saree",
        "sari",
        "basket",
        "pottery",
        "craft",
        "product",
        "under",
        "below",
        "₹",
        "rupee",
      ])) ||
    /\brs\b/.test(lower)
  ) {
    return {
      intent: "FIND_CATALOG",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  if (pending?.intent === "CREATE_PRODUCT") {
    const merged = { ...pending.product };
    const quantity = spokenNumber(lower);
    const price = lower.match(/(\d[\d,]{1,7})/);
    if (pending.missingField === "quantity" && quantity !== null) merged.quantity = quantity;
    if (pending.missingField === "price" && price)
      merged.price = Number(price[1].replace(/,/g, ""));
    return {
      intent: "CREATE_PRODUCT",
      product: normaliseProduct(merged),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (pending?.intent === "GET_PRICE_HELP") {
    return {
      intent: "GET_PRICE_HELP",
      product: normaliseProduct(null),
      target: clean(lower),
      price: null,
      quantity: null,
      query: null,
      pricingDetails: collectPricingDetails(text, {
        ...pending.pricingDetails,
        missingField: pending.missingField,
      }),
    };
  }

  if (has(lower, ["remove", "delete", "unlist", "take down", "stop selling"])) {
    return {
      intent: "DELETE_PRODUCT",
      product: normaliseProduct(null),
      target: clean(lower),
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    has(lower, ["change", "update", "set", "increase", "reduce"]) &&
    has(lower, ["price", "rupee", "rs", "₹", "cost"])
  ) {
    return {
      intent: "UPDATE_PRODUCT",
      product: normaliseProduct(null),
      target: clean(lower),
      price: spokenNumber(lower),
      quantity: null,
      query: null,
    };
  }

  const productConcept = has(lower, [
    "product",
    "products",
    "listing",
    "listings",
    "catalog",
    "catalogue",
    "inventory",
    "item",
    "items",
  ]);
  const viewAction =
    has(lower, ["show", "display", "view", "see", "find", "get", "browse", "what", "which"]) ||
    (has(lower, ["list"]) &&
      has(lower, [
        "my products",
        "all products",
        "product catalog",
        "product catalogue",
        "inventory",
      ]));

  if (
    has(lower, ["buyers", "buyer", "enquiries", "enquiry", "requests", "leads"]) &&
    (viewAction || has(lower, ["buyer", "buyers", "enquiries", "enquiry"]))
  ) {
    return {
      intent: "VIEW_ENQUIRIES",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    has(lower, ["sales", "revenue", "earned", "income", "sold"]) &&
    (viewAction || has(lower, ["sales", "revenue", "earned", "income", "sold"]))
  ) {
    return {
      intent: "VIEW_SALES",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    has(lower, ["charge", "price", "how much", "cost", "rate", "pricing", "what should i ask"]) &&
    !has(lower, ["price range", "how much do people pay", "market price", "best price"])
  ) {
    const targetMatch = lower.match(/(?:for|on|of)\s+(?:my\s+)?([a-z0-9][a-z0-9 ]{1,60})/);
    const target = targetMatch?.[1]
      ?.replace(/^(?:this|that|product|item)\b\s*/i, "")
      .replace(/\b(?:please|now|today)\b.*$/i, "")
      .trim();
    return {
      intent: "GET_PRICE_HELP",
      product: normaliseProduct(null),
      target: target ? clean(target) : null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    productConcept &&
    viewAction &&
    !has(lower, ["add", "create", "publish", "upload", "sell", "new product"])
  ) {
    return {
      intent: "VIEW_PRODUCTS",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (has(lower, ["scheme", "subsidy", "yojana", "government help", "financial help", "grant"])) {
    return {
      intent: "FIND_SCHEMES",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  if (
    has(lower, [
      "learn",
      "training",
      "course",
      "teach",
      "tutorial",
      "how to sell",
      "sell online",
      "photograph",
      "photography",
      "pricing",
      "social media",
      "marketing",
    ])
  ) {
    return {
      intent: "FIND_TRAINING",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  if (
    has(lower, ["market", "demand", "price range", "trend", "how much do people pay", "best price"])
  ) {
    return {
      intent: "MARKET_INFO",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: clean(lower),
    };
  }

  if (has(lower, ["order", "orders", "sold", "buyer order", "delivery", "shipped"])) {
    return {
      intent: "VIEW_ORDERS",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    has(lower, [
      "show my product",
      "show products",
      "my products",
      "my catalog",
      "list my products",
      "what do i have",
      "products i have",
    ])
  ) {
    return {
      intent: "VIEW_PRODUCTS",
      product: normaliseProduct(null),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  if (
    has(lower, ["list", "sell", "add", "post", "put", "create", "publish", "upload"]) &&
    !has(lower, ["list my products", "show my products"])
  ) {
    const currencyMatch = lower.match(/(\d[\d,]{1,7})\s*(?:rupees?|rs\b|₹)/);
    const forMatch = lower.match(/\bfor\s+(\d[\d,]{1,7})\b/);
    const priceValue = currencyMatch ?? forMatch;
    const price = priceValue ? Number(priceValue[1].replace(/,/g, "")) : null;
    const quantityMatch = lower.match(/(\d+)\s*(?:pieces?|sarees?|saris|units?|items?)/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : null;

    const name = lower
      .replace(/(\d[\d,]*)/g, " ")
      .replace(
        /\b(rupees?|rupee|rs|paise|only|please|list|my|for|at|price|and|available|in|stock|selling|sell|add|post|put|create|publish|upload|online|a|an|product|listing|new)\b/g,
        " ",
      )
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      intent: "CREATE_PRODUCT",
      product: normaliseProduct({
        name: name ? name.charAt(0).toUpperCase() + name.slice(1) : null,
        price,
        quantity,
      }),
      target: null,
      price: null,
      quantity: null,
      query: null,
    };
  }

  return {
    intent: "GENERAL_QUESTION",
    product: normaliseProduct(null),
    target: null,
    price: null,
    quantity: null,
    query: clean(lower),
  };
}

async function callLlm(text, pending) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (pending) {
    messages.push({ role: "user", content: `Pending step: ${JSON.stringify(pending)}` });
  }
  messages.push({ role: "user", content: text });

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }
  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content ?? null;
}

async function callAssistant(messages, options = {}) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.2, ...options, messages }),
  });
  if (!response.ok) throw new Error(`Assistant request failed with status ${response.status}`);
  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function answerQuestion(text, image = null, imageContext = null) {
  const question = imageContext
    ? `Photo context: ${JSON.stringify(imageContext)}\nUser question: ${text}`
    : text;
  const content = image
    ? [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: image } },
      ]
    : question;
  try {
    return await callAssistant([
      {
        role: "system",
        content:
          "You are H-Connect, a helpful assistant for Indian artisans. Answer the user's actual question in 2-4 short sentences, " +
          "using plain spoken language without Markdown. Use the attached photo when present. Be clear when a visual detail or price " +
          "is only an estimate. Do not repeat a generic help menu.",
      },
      { role: "user", content },
    ]);
  } catch (error) {
    console.warn("[ai] could not answer the question:", error.message);
    return null;
  }
}

const IMAGE_ANALYSIS_PROMPT = `Inspect this artisan product photo and return only a JSON object with these fields:
{
  "name": "short listing name",
  "description": "one or two factual sentences about visible design and condition",
  "category": "product category",
  "craft": "likely craft technique or null",
  "material": "likely material or null",
  "color": "main visible color",
  "suggestedPrice": 0,
  "priceRangeLow": 0,
  "priceRangeHigh": 0,
  "priceReason": "brief explanation of this approximate INR price",
  "confidence": "low, medium, or high"
}
Only describe visible evidence. Mark uncertain materials as likely, and use null rather than guessing. Estimate a fair INR listing price for a handmade artisan product in India; this is an approximate recommendation, not live market data. Use whole numbers for price values.`;

function positiveAmount(value) {
  const amount = toNumber(value);
  return amount !== null && amount > 0 ? Math.round(amount) : null;
}

export async function analyzeProductImage(image) {
  const raw = await callAssistant(
    [
      {
        role: "user",
        content: [
          { type: "text", text: IMAGE_ANALYSIS_PROMPT },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
    { temperature: 0, max_tokens: 500, response_format: { type: "json_object" } },
  );
  const parsed = extractJson(raw);
  if (!parsed) throw new Error("The image could not be analyzed. Please try another photo.");
  return {
    name: clean(parsed.name),
    description: clean(parsed.description),
    category: clean(parsed.category),
    craft: clean(parsed.craft),
    material: clean(parsed.material),
    color: clean(parsed.color),
    suggestedPrice: positiveAmount(parsed.suggestedPrice),
    priceRangeLow: positiveAmount(parsed.priceRangeLow),
    priceRangeHigh: positiveAmount(parsed.priceRangeHigh),
    priceReason: clean(parsed.priceReason),
    confidence: ["low", "medium", "high"].includes(parsed.confidence)
      ? parsed.confidence
      : "medium",
  };
}

/**
 * @param {string} text what the artisan said (or typed)
 * @param {{intent: string, product?: object, missingField?: string} | null} pending
 * @returns {Promise<{result: object, source: "llm" | "local"}>}
 */
export async function parseCommand(text, pending = null) {
  const input = String(text ?? "").trim();
  if (!input) {
    return { result: normaliseResult({ intent: "UNKNOWN" }), source: "local" };
  }

  const genericListingRequest = input
    .toLowerCase()
    .replace(/[.!?]/g, "")
    .replace(/^(?:i want to|i would like to|i'd like to|please)\s+/, "")
    .replace(/\s+please$/, "");
  if (
    /^(?:list|add|create|post)\s+(?:(?:my|a|an)\s+)?(?:new\s+)?(?:product|listing)$/.test(
      genericListingRequest,
    )
  ) {
    return {
      result: normaliseResult(JSON.stringify({ intent: "CREATE_PRODUCT" })),
      source: "local",
    };
  }

  const localResult = parseLocally(input, pending);
  if (
    [
      "FIND_CATALOG",
      "PRODUCT_INFO",
      "FIND_OPPORTUNITIES",
      "VIEW_PRODUCTS",
      "VIEW_SALES",
      "VIEW_ENQUIRIES",
      "GET_PRICE_HELP",
    ].includes(localResult.intent)
  ) {
    return { result: localResult, source: "local" };
  }
  if (localResult.intent === "GENERAL_QUESTION") {
    return { result: localResult, source: "local" };
  }

  try {
    const raw = await callLlm(input, pending);
    const parsed = raw ? normaliseResult(raw) : null;
    if (parsed) return { result: parsed, source: "llm" };
  } catch (error) {
    console.warn("[ai] falling back to the local parser:", error.message);
  }

  return { result: localResult, source: "local" };
}

export { INTENTS };
