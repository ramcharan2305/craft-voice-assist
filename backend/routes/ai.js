import express, { Router } from "express";

import { requireSupabase, supabaseConfigured } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import {
  analyzeProductImage,
  answerQuestion,
  calculateCostBasedPrice,
  parseCommand,
} from "../services/aiService.js";
import { synthesizeSpeech, transcribeAudio, translateText } from "../services/sarvamService.js";
import { toEnquiry, toOrder, toProduct } from "../services/mappers.js";
import {
  REFERENCE_SCHEMES,
  REFERENCE_TRAINING,
  REFERENCE_MARKET,
} from "../services/referenceData.js";

const router = Router();

const rupees = (value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
const hasLanguage = (language) => language === "en" || language === "te";

router.post(
  "/speech-to-text",
  requireArtisan,
  express.raw({ type: "audio/*", limit: "10mb" }),
  async (req, res, next) => {
    try {
      const language = req.query.language;
      if (!hasLanguage(language)) {
        return res.status(400).json({ error: "Choose Telugu or English before recording." });
      }
      const transcript = await transcribeAudio(req.body, req.get("content-type"), language);
      return res.json({ transcript });
    } catch (error) {
      return next(error);
    }
  },
);

router.post("/translate", requireArtisan, async (req, res, next) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const language = req.body?.language;
    if (!text || text.length > 2500) {
      return res
        .status(400)
        .json({ error: "Text to translate must be between 1 and 2,500 characters." });
    }
    if (!hasLanguage(language)) {
      return res.status(400).json({ error: "Choose Telugu or English for translation." });
    }
    const translated = language === "te" ? await translateText(text, "en", "te") : text;
    return res.json({ text: translated });
  } catch (error) {
    return next(error);
  }
});

router.post("/speech", requireArtisan, async (req, res, next) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const language = req.body?.language;
    if (!text || text.length > 2500) {
      return res
        .status(400)
        .json({ error: "Spoken responses must be between 1 and 2,500 characters." });
    }
    if (!hasLanguage(language)) {
      return res.status(400).json({ error: "Choose Telugu or English for voice playback." });
    }
    const audio = await synthesizeSpeech(text, language);
    return res.type("audio/wav").send(audio);
  } catch (error) {
    return next(error);
  }
});

function catalogSearchText(text) {
  return text
    .toLowerCase()
    .replace(/(?:under|below|less than)\s*(?:₹|rs\.?)?\s*[\d,]+|(?:₹|rs\.?)\s*[\d,]+/gi, " ")
    .replace(
      /\b(find|search|show|me|look|for|browse|tell|about|details|describe|this|product|products|please|rupees?|rs)\b/gi,
      " ",
    )
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function maxPriceFrom(text) {
  const match = text.match(
    /(?:under|below|less than)\s*(?:₹|rs\.?)?\s*([\d,]+)|(?:₹|rs\.?)\s*([\d,]+)/i,
  );
  const amount = match?.[1] ?? match?.[2];
  return amount ? Number(amount.replace(/,/g, "")) : null;
}

function catalogMatches(product, query) {
  const terms = query
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .map((word) =>
      word.endsWith("ies")
        ? `${word.slice(0, -3)}y`
        : word.endsWith("s")
          ? word.slice(0, -1)
          : word,
    );
  const fields =
    `${product.name} ${product.description} ${product.category} ${product.material} ${product.craft}`.toLowerCase();
  return !terms.length || terms.every((term) => fields.includes(term));
}

router.post("/analyze-image", requireArtisan, async (req, res, next) => {
  try {
    const image = typeof req.body?.image === "string" ? req.body.image : "";
    if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(image)) {
      return res.status(400).json({ error: "Please upload a JPEG, PNG, or WebP product photo." });
    }
    if (image.length > 1_800_000) {
      return res
        .status(413)
        .json({ error: "This photo is too large to analyze. Choose a smaller image." });
    }
    if (!process.env.LLM_API_KEY) {
      return res
        .status(503)
        .json({ error: "Image analysis is not configured. Add an LLM_API_KEY to backend/.env." });
    }
    res.json(await analyzeProductImage(image));
  } catch (error) {
    next(error);
  }
});

async function loadProducts(artisanId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toProduct);
}

/** Finds the artisan's own product that best matches spoken words. */
function findProduct(products, target) {
  if (!target) return undefined;
  const needle = target.toLowerCase();
  const words = needle
    .split(/[^a-z]+/)
    .filter((word) => word.length > 2 && !["the", "my", "price", "saree", "piece"].includes(word));
  const has = (value) => value && needle.includes(String(value).toLowerCase());

  return (
    products.find((p) => has(p.name)) ??
    products.find((p) =>
      words.some((w) =>
        `${p.name} ${p.category} ${p.craft} ${p.materials}`.toLowerCase().includes(w),
      ),
    )
  );
}

/** Merges newly understood fields over what is already known, ignoring empty values. */
function mergeProduct(known, incoming) {
  const merged = { ...known };
  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value !== null && value !== undefined && value !== "") merged[key] = value;
  }
  return merged;
}

async function handleCreateProduct(req, res, parsed, pending) {
  const merged = mergeProduct(
    pending?.intent === "CREATE_PRODUCT" ? pending.product : {},
    parsed.product,
  );

  if (!merged.name) {
    return res.json({
      intent: "CREATE_PRODUCT",
      message: "Let’s add your product. Add a photo or enter its details on the listing page.",
      speak: "Let’s add your product. I’m opening the listing page.",
      navigate: "/list",
    });
  }

  if (merged.price === null || merged.price === undefined) {
    return res.json({
      intent: "CREATE_PRODUCT",
      needsInput: true,
      missingField: "price",
      question: `How much do you want to sell your ${merged.name} for?`,
      pending: { intent: "CREATE_PRODUCT", product: merged, missingField: "price" },
    });
  }

  if (merged.quantity === null || merged.quantity === undefined) {
    return res.json({
      intent: "CREATE_PRODUCT",
      needsInput: true,
      missingField: "quantity",
      question: `How many ${merged.name} are available?`,
      pending: { intent: "CREATE_PRODUCT", product: merged, missingField: "quantity" },
    });
  }

  return res.json({
    intent: "CREATE_PRODUCT",
    message: `I’ve prepared a draft for ${merged.name}. Review the details and submit it for approval.`,
    speak: `I’ve prepared a draft for ${merged.name}. Please review the details.`,
    navigate: "/list",
    draft: {
      name: merged.name,
      description: merged.description ?? "",
      category: merged.category ?? "",
      craft: merged.category ?? "",
      material: merged.material ?? "",
      color: merged.color ?? "",
      price: merged.price,
      quantity: merged.quantity,
    },
  });
}

/**
 * POST /api/ai/command
 *
 * Body: { text: string, pending?: object }
 *
 * The LLM only classifies the sentence. Every database change happens here,
 * in plain code, using the artisan resolved from the access token.
 */
router.post("/command", requireArtisan, async (req, res, next) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    const pending = req.body?.pending ?? null;
    const language = req.body?.language ?? "en";
    const image =
      typeof req.body?.image === "string" &&
      req.body.image.length <= 1_800_000 &&
      /^data:image\/(?:jpeg|png|webp);base64,/i.test(req.body.image)
        ? req.body.image
        : null;
    const imageContext =
      req.body?.imageContext && typeof req.body.imageContext === "object"
        ? req.body.imageContext
        : null;

    if (!text) return res.status(400).json({ error: "Please say or type something first." });
    if (text.length > 1000) {
      return res.status(400).json({ error: "Please keep a voice command under 1,000 characters." });
    }
    if (!hasLanguage(language)) {
      return res.status(400).json({ error: "Choose Telugu or English for voice commands." });
    }

    const commandText =
      language === "te" && /[\u0c00-\u0c7f]/u.test(text)
        ? await translateText(text, "te", "en")
        : text;
    const { result, source } = await parseCommand(commandText, pending);
    const needsArtisan = [
      "CREATE_PRODUCT",
      "VIEW_PRODUCTS",
      "VIEW_SALES",
      "VIEW_ENQUIRIES",
      "GET_PRICE_HELP",
      "UPDATE_PRODUCT",
      "DELETE_PRODUCT",
      "VIEW_ORDERS",
    ].includes(result.intent);

    if (needsArtisan && !req.artisan) {
      return res.status(503).json({
        error: "No artisan profile exists yet. Run: cd backend && npm run seed",
        code: "NO_ARTISAN",
      });
    }

    switch (result.intent) {
      case "CREATE_PRODUCT":
        return await handleCreateProduct(req, res, result, pending);

      case "VIEW_PRODUCTS": {
        const products = await loadProducts(req.artisan.id);
        const message = products.length
          ? `You have ${products.length} product${products.length === 1 ? "" : "s"}.`
          : "You have no products yet. Say “list my saree for 2000 rupees” to add one.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/products",
          data: { products },
        });
      }

      case "VIEW_SALES": {
        const supabase = requireSupabase();
        const { data, error } = await supabase
          .from("orders")
          .select("*, products(name)")
          .eq("artisan_id", req.artisan.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const orders = data.map((row) => ({
          ...toOrder(row, row.products?.name),
          product_name: row.products?.name ?? "Product",
        }));
        const completedSales = orders.filter(
          (order) => order.status === "completed" || order.status === "shipped",
        );
        const value = completedSales.reduce((sum, order) => sum + order.amount, 0);
        const message = completedSales.length
          ? `I found ${completedSales.length} completed or shipped order${completedSales.length === 1 ? "" : "s"} with a recorded total value of ${rupees(value)}. H-Connect does not record payment collection.`
          : orders.length
            ? `There are ${orders.length} recorded order${orders.length === 1 ? "" : "s"}, but none are completed or shipped yet. H-Connect does not record payment collection.`
            : "No orders or sales are recorded yet. H-Connect does not record payment collection.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/sales",
          data: { orders },
        });
      }

      case "VIEW_ENQUIRIES": {
        const supabase = requireSupabase();
        const { data, error } = await supabase
          .from("enquiries")
          .select("*, products(name,image_url), artisans(name)")
          .eq("artisan_id", req.artisan.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const enquiries = data.map(toEnquiry);
        const message = enquiries.length
          ? `I found ${enquiries.length} buyer enquiry${enquiries.length === 1 ? "" : "ies"}.`
          : "There are no buyer enquiries recorded yet.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/buyers",
          data: { enquiries },
        });
      }

      case "GET_PRICE_HELP": {
        if (pending?.intent === "GET_PRICE_HELP") {
          const details = result.pricingDetails ?? pending.pricingDetails ?? {};
          const laborCost =
            Number(details.laborCost) > 0
              ? Number(details.laborCost)
              : Number(details.laborHours) > 0 && Number(details.hourlyRate) > 0
                ? Number(details.laborHours) * Number(details.hourlyRate)
                : null;
          const missingField = !details.productName
            ? "productName"
            : !Number.isFinite(Number(details.materialCost)) || Number(details.materialCost) < 0
              ? "materialCost"
              : laborCost === null
                ? "laborCost"
                : !Number.isFinite(Number(details.profitPercent)) ||
                    Number(details.profitPercent) < 0 ||
                    Number(details.profitPercent) > 500
                  ? "profitPercent"
                  : null;

          if (missingField) {
            const questions = {
              productName: "Which saree or model are you pricing? Tell me its name.",
              materialCost:
                "How much did the materials or fabric for that saree cost? Please give the amount in rupees.",
              laborCost:
                "What is the total labour cost for one saree, or how many hours does it take and what is your own hourly rate?",
              profitPercent:
                "What profit percentage would you like to add to your costs? For example, 20 percent.",
            };
            const question = questions[missingField];
            return res.json({
              intent: result.intent,
              needsInput: true,
              missingField,
              question,
              pending: {
                intent: "GET_PRICE_HELP",
                product: {},
                missingField,
                pricingDetails: details,
              },
            });
          }

          const materialCost = Number(details.materialCost);
          const extraCost = Number(details.extraCost ?? 0);
          const { productionCost, suggestedPrice } = calculateCostBasedPrice({
            materialCost,
            laborCost,
            extraCost,
            profitPercent: Number(details.profitPercent),
          });
          const message = `Based on the details you gave for ${details.productName}, your material cost is ${rupees(materialCost)}, labour is ${rupees(laborCost)}, and other costs are ${rupees(extraCost)}. That makes a production cost of ${rupees(productionCost)}. With your requested ${details.profitPercent}% profit, the suggested price is ${rupees(suggestedPrice)}. This is a calculation from your inputs, not verified market pricing.`;
          return res.json({
            intent: result.intent,
            message,
            speak: message,
            data: {
              pricing: {
                productName: details.productName,
                materialCost,
                laborCost,
                extraCost,
                productionCost,
                profitPercent: Number(details.profitPercent),
                suggestedPrice,
              },
            },
          });
        }

        const products = await loadProducts(req.artisan.id);
        const product = findProduct(products, result.target);
        if (product && product.price > 0) {
          const message = `Your existing ${product.name} listing is priced at ${rupees(product.price)}. This is your saved listing price, not a market valuation.`;
          return res.json({
            intent: result.intent,
            message,
            speak: message,
            navigate: "/products",
            data: { products: [product] },
          });
        }

        const suggestedPrice = Number(imageContext?.suggestedPrice);
        if (
          imageContext?.name &&
          Number.isFinite(suggestedPrice) &&
          suggestedPrice > 0 &&
          (!result.target ||
            String(result.target).toLowerCase().includes(imageContext.name.toLowerCase()))
        ) {
          const message = `The photo analysis for your ${imageContext.name} draft estimated ${rupees(suggestedPrice)}. This is an AI estimate, not verified market pricing.`;
          return res.json({
            intent: result.intent,
            message,
            speak: message,
            navigate: "/list",
          });
        }

        return res.json({
          intent: result.intent,
          needsInput: true,
          missingField: "productName",
          question:
            "Tell me the saree or model name, material cost in rupees, labour cost (or hours and your hourly rate), and the profit percentage you want. For example: Pochampally silk saree; material cost ₹1,200; 10 hours; ₹150 per hour; 20% profit.",
          pending: {
            intent: "GET_PRICE_HELP",
            product: {},
            missingField: "productName",
            pricingDetails: {},
          },
        });
      }

      case "UPDATE_PRODUCT": {
        const products = await loadProducts(req.artisan.id);
        const product = findProduct(products, result.target);
        if (!product) {
          return res.json({
            intent: result.intent,
            needsInput: true,
            missingField: "target",
            question: "Which product should I change?",
            pending: null,
          });
        }
        if (result.price === null) {
          return res.json({
            intent: result.intent,
            needsInput: true,
            missingField: "price",
            question: `What is the new price for your ${product.name}?`,
            pending: {
              intent: "UPDATE_PRODUCT",
              productId: product.id,
              product: product,
              missingField: "price",
            },
          });
        }
        const supabase = requireSupabase();
        const { data, error } = await supabase
          .from("products")
          .update({ price: result.price, updated_at: new Date().toISOString() })
          .eq("id", product.id)
          .eq("artisan_id", req.artisan.id)
          .select()
          .single();
        if (error) throw error;
        const updated = toProduct(data);
        const message = `${updated.name} now costs ${rupees(updated.price)}.`;
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/products",
          data: { products: [updated] },
        });
      }

      case "DELETE_PRODUCT": {
        const products = await loadProducts(req.artisan.id);
        const product = findProduct(products, result.target);
        if (!product) {
          return res.json({
            intent: result.intent,
            needsInput: true,
            missingField: "target",
            question: "Which product should I remove?",
            pending: null,
          });
        }
        const supabase = requireSupabase();
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", product.id)
          .eq("artisan_id", req.artisan.id);
        if (error) throw error;
        const message = `${product.name} has been removed.`;
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/products",
          needsConfirm: false,
          removedId: product.id,
        });
      }

      case "VIEW_ORDERS": {
        const supabase = requireSupabase();
        const { data, error } = await supabase
          .from("orders")
          .select("*, products(name)")
          .eq("artisan_id", req.artisan.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const orders = data.map((row) => ({
          ...toOrder(row, row.products?.name),
          product_name: row.products?.name ?? "Product",
        }));
        const message = orders.length
          ? `You have ${orders.length} orders.`
          : "You have no orders yet.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/orders",
          data: { orders },
        });
      }

      case "FIND_CATALOG":
      case "PRODUCT_INFO": {
        const supabase = requireSupabase();
        const query = catalogSearchText(commandText);
        const maxPrice = maxPriceFrom(commandText);
        const { data, error } = await supabase
          .from("products")
          .select("*, artisans!inner(name, location, craft_type, verification_status)")
          .eq("review_status", "approved")
          .eq("status", "listed")
          .gt("quantity", 0)
          .eq("artisans.verification_status", "approved")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        const matches = data
          .filter(
            (row) =>
              (maxPrice === null || Number(row.price) <= maxPrice) && catalogMatches(row, query),
          )
          .slice(0, 5)
          .map(toProduct);

        if (result.intent === "PRODUCT_INFO" && matches.length === 0) {
          const message =
            "I couldn't find an approved product matching that name in the catalogue.";
          return res.json({
            intent: result.intent,
            message,
            speak: message,
            data: { products: [] },
          });
        }
        if (!matches.length) {
          const message = "I couldn't find approved products matching those details.";
          return res.json({
            intent: result.intent,
            message,
            speak: message,
            data: { products: [] },
          });
        }
        const product = matches[0];
        const message =
          result.intent === "PRODUCT_INFO"
            ? `${product.name}: ${product.description || "No description has been provided."} Price ${rupees(product.price)}. ${product.quantity} available.`
            : `I found ${matches.length} approved product${matches.length === 1 ? "" : "s"}${maxPrice === null ? "" : ` below ${rupees(maxPrice)}`}. ${matches.map((item) => `${item.name}, ${rupees(item.price)}`).join("; ")}.`;
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/user",
          data: { products: matches },
        });
      }

      case "FIND_OPPORTUNITIES": {
        let items;
        if (supabaseConfigured) {
          const supabase = requireSupabase();
          const { data, error } = await supabase
            .from("market_insights")
            .select("*")
            .order("id", { ascending: true });
          if (error) throw error;
          items = data;
        } else {
          items = REFERENCE_MARKET;
        }
        const exhibitionQuery = /exhibition|event|fair|trade show/i.test(commandText);
        const filtered = items.filter((item) => {
          const body =
            `${item.product_category} ${item.region} ${item.demand} ${item.trend}`.toLowerCase();
          return !exhibitionQuery || /exhibition|event|fair|trade show/i.test(body);
        });
        const message = filtered.length
          ? `I found ${filtered.length} ${supabaseConfigured ? "stored market opportunity record" : "sample market record"}${filtered.length === 1 ? "" : "s"}. Please check the linked source before making plans.`
          : "I don't have any verified upcoming exhibition details in the stored records. I won't guess at dates or events.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/market",
          data: {
            market: {
              isDemo: !supabaseConfigured || items.some((item) => item.is_demo),
              note: supabaseConfigured
                ? "Stored market information; verify details at the source."
                : "Sample market data, not a live event feed.",
              items: filtered,
            },
          },
        });
      }

      case "FIND_SCHEMES": {
        let schemes;
        if (supabaseConfigured) {
          const supabase = requireSupabase();
          const { data, error } = await supabase
            .from("schemes")
            .select("*")
            .order("id", { ascending: true });
          if (error) throw error;
          schemes = data;
        } else {
          schemes = REFERENCE_SCHEMES;
        }
        const message = schemes.length
          ? `I found ${schemes.length} government schemes for you.`
          : "No schemes are available yet.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/schemes",
          data: { schemes },
        });
      }

      case "FIND_TRAINING": {
        let training;
        if (supabaseConfigured) {
          const supabase = requireSupabase();
          const { data, error } = await supabase
            .from("training_resources")
            .select("*")
            .order("id", { ascending: true });
          if (error) throw error;
          training = data;
        } else {
          training = REFERENCE_TRAINING;
        }
        const message = training.length
          ? `I found ${training.length} learning resources to help you sell online.`
          : "No training resources are available yet.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/training",
          data: { training },
        });
      }

      case "MARKET_INFO": {
        let items;
        if (supabaseConfigured) {
          const supabase = requireSupabase();
          const { data, error } = await supabase
            .from("market_insights")
            .select("*")
            .order("id", { ascending: true });
          if (error) throw error;
          items = data;
        } else {
          items = REFERENCE_MARKET;
        }
        const message = items.length
          ? "Here are sample market figures. They are demo data, not live prices."
          : "No market figures are available yet.";
        return res.json({
          intent: result.intent,
          message,
          speak: message,
          navigate: "/market",
          data: { market: { isDemo: true, note: "Sample market figures, not live data.", items } },
        });
      }

      case "GENERAL_QUESTION":
      default: {
        const answer = await answerQuestion(text, image, imageContext);
        const message =
          answer ??
          (image || imageContext
            ? "I couldn't answer from that photo just now. Please try again in a moment."
            : "I couldn't reach the answer service just now. Please try again in a moment.");
        return res.json({
          intent: result.intent === "GENERAL_QUESTION" ? "GENERAL_QUESTION" : "UNKNOWN",
          message,
          speak: message,
          source,
        });
      }
    }
  } catch (error) {
    next(error);
  }
});

export default router;
