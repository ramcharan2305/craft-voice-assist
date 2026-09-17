export type IntentName =
  | "CREATE_PRODUCT"
  | "GET_PRODUCTS"
  | "UPDATE_PRODUCT"
  | "UNLIST_PRODUCT"
  | "GET_SALES"
  | "GET_BUYERS"
  | "GET_PRICE_HELP"
  | "HELP"
  | "UNKNOWN";

export type Intent = {
  name: IntentName;
  /** Plain-language echo of what the assistant will do. */
  reply: string;
  /** Where the assistant should take the artisan, when relevant. */
  to?: string | undefined;
  price?: number | undefined;
  /** Words used to find the product the artisan means. */
  target?: string | undefined;
  /** Actions that change or remove something must be confirmed first. */
  needsConfirm?: boolean;
};

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

const findPrice = (text: string) => {
  const match = text.replace(/,/g, "").match(/(\d{2,6})/);
  return match ? Number(match[1]) : undefined;
};

const findTarget = (text: string) => {
  const nouns = ["saree", "sari", "basket", "pot", "pottery", "elephant", "wood", "cushion", "embroidery", "necklace", "jewelry"];
  return nouns.find((n) => text.includes(n));
};

export function parseIntent(raw: string): Intent {
  const text = raw.toLowerCase().trim();
  if (!text) {
    return { name: "UNKNOWN", reply: "I couldn't hear anything. Please try again." };
  }

  if (has(text, ["help", "how do i", "guide", "teach"])) {
    return { name: "HELP", reply: "I'll show you what you can say to me.", to: "/help" };
  }

  if (has(text, ["remove", "unlist", "delete", "take down"])) {
    const target = findTarget(text);
    return {
      name: "UNLIST_PRODUCT",
      reply: target ? `I can remove your ${target} from the market.` : "I can remove a product from the market.",
      target,
      needsConfirm: true,
      to: "/products",
    };
  }

  if (has(text, ["change", "set", "update", "make it"]) && has(text, ["price", "rupee", "₹", "rs", "cost"])) {
    const price = findPrice(text);
    const target = findTarget(text);
    return {
      name: "UPDATE_PRODUCT",
      reply: price
        ? `I can change the price of your ${target ?? "product"} to ₹${price.toLocaleString("en-IN")}.`
        : "Tell me the new price and I'll change it.",
      price,
      target,
      needsConfirm: Boolean(price),
      to: "/products",
    };
  }

  if (has(text, ["list", "sell", "add"]) && !has(text, ["my products", "products i"])) {
    return { name: "CREATE_PRODUCT", reply: "Sure. Let's get your product ready for the market.", to: "/list" };
  }

  if (has(text, ["my product", "products", "show me my", "my sarees", "my baskets", "catalog"])) {
    return { name: "GET_PRODUCTS", reply: "Here are your products.", to: "/products" };
  }

  if (has(text, ["sold", "sales", "earned", "business", "income"])) {
    return { name: "GET_SALES", reply: "Here is your business at a glance.", to: "/sales" };
  }

  if (has(text, ["buyer", "buyers", "who will buy", "market", "orders"])) {
    return { name: "GET_BUYERS", reply: "Here are buyers looking for crafts like yours.", to: "/buyers" };
  }

  if (has(text, ["charge", "price", "how much", "rate"])) {
    return { name: "GET_PRICE_HELP", reply: "I can suggest a fair price for your craft.", to: "/list" };
  }

  return {
    name: "UNKNOWN",
    reply: "I couldn't understand that. Please try again.",
  };
}

export const INTENT_LABEL: Record<IntentName, string> = {
  CREATE_PRODUCT: "List a product",
  GET_PRODUCTS: "Show products",
  UPDATE_PRODUCT: "Change a product",
  UNLIST_PRODUCT: "Remove a product",
  GET_SALES: "Show sales",
  GET_BUYERS: "Find buyers",
  GET_PRICE_HELP: "Suggest a price",
  HELP: "Help",
  UNKNOWN: "Not understood",
};
