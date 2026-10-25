import { Router } from "express";

import { requireSupabase, supabaseConfigured } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { analyzeProductImage, answerQuestion, parseCommand } from "../services/aiService.js";
import { toOrder, toProduct } from "../services/mappers.js";
import {
  REFERENCE_SCHEMES,
  REFERENCE_TRAINING,
  REFERENCE_MARKET,
} from "../services/referenceData.js";

const router = Router();

const rupees = (value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
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

    const { result, source } = await parseCommand(text, pending);
    const needsArtisan = [
      "CREATE_PRODUCT",
      "VIEW_PRODUCTS",
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
        const query = catalogSearchText(text);
        const maxPrice = maxPriceFrom(text);
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
        const exhibitionQuery = /exhibition|event|fair|trade show/i.test(text);
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
