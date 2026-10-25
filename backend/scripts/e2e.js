/**
 * Authenticated end-to-end check for the artisan -> admin -> buyer workflow.
 *
 * Run after `npm run db:setup && npm run seed && npm run seed:accounts`
 * while the backend is running: `node scripts/e2e.js`.
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const API = `http://localhost:${process.env.PORT ?? 5000}/api`;
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const results = [];
let productId;
let enquiryId;

function check(name, condition, detail = "") {
  results.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) throw new Error(`End-to-end check failed: ${name}`);
}

async function call(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

async function login(email) {
  const result = await call("/auth/login", {
    method: "POST",
    body: { email, password: "hconnect123" },
  });
  if (result.status !== 200 || !result.payload?.access_token) {
    throw new Error(`Could not sign in ${email}: ${result.payload?.error ?? result.status}`);
  }
  return result.payload;
}

async function main() {
  check("health", (await call("/health")).status === 200);

  const merchant = await login("lakshmi@hconnect.app");
  const buyer = await login("buyer@hconnect.app");
  const admin = await login("admin@hconnect.app");

  const wrongRole = await call("/admin/summary", { token: buyer.access_token });
  check("role guard blocks buyer from admin routes", wrongRole.status === 403);

  const artisanProducts = await call("/products", { token: merchant.access_token });
  check(
    "artisan products are authenticated and loaded",
    artisanProducts.status === 200 && Array.isArray(artisanProducts.payload),
    `${artisanProducts.payload?.length ?? 0} rows`,
  );

  const voiceDraft = await call("/ai/command", {
    method: "POST",
    token: merchant.access_token,
    body: { text: "List my blue cotton saree for 2500 rupees with five pieces" },
  });
  check(
    "voice/text listing prepares an editable draft without bypassing review",
    voiceDraft.status === 200 &&
      voiceDraft.payload?.intent === "CREATE_PRODUCT" &&
      voiceDraft.payload?.draft?.price === 2500 &&
      voiceDraft.payload?.draft?.quantity === 5 &&
      voiceDraft.payload?.navigate === "/list",
    voiceDraft.payload?.message,
  );

  const genericListing = await call("/ai/command", {
    method: "POST",
    token: merchant.access_token,
    body: { text: "List my product" },
  });
  check(
    "generic product listing opens the listing form",
    genericListing.status === 200 &&
      genericListing.payload?.intent === "CREATE_PRODUCT" &&
      genericListing.payload?.navigate === "/list" &&
      !genericListing.payload?.needsInput,
    genericListing.payload?.message,
  );

  const marker = `H-Connect E2E ${Date.now()}`;
  const created = await call("/products", {
    method: "POST",
    token: merchant.access_token,
    body: {
      name: marker,
      description: "Temporary integration test listing.",
      category: "E2E craft",
      craft: "Handmade",
      material: "Cotton",
      color: "Natural",
      price: 425,
      quantity: 2,
    },
  });
  productId = created.payload?.id;
  check(
    "merchant submission is persisted pending moderation",
    created.status === 201 && created.payload?.review_status === "pending",
    created.payload?.name,
  );

  const hiddenListing = await call(`/products/catalog?q=${encodeURIComponent(marker)}`, {
    token: buyer.access_token,
  });
  check(
    "pending listing is hidden from buyer catalogue",
    hiddenListing.status === 200 && hiddenListing.payload.length === 0,
  );

  const approved = await call(`/admin/products/${productId}/review`, {
    method: "PUT",
    token: admin.access_token,
    body: { action: "approve" },
  });
  check(
    "admin approval is saved",
    approved.status === 200 && approved.payload?.review_status === "approved",
  );

  const catalog = await call(`/products/catalog?q=${encodeURIComponent(marker)}`, {
    token: buyer.access_token,
  });
  check(
    "approved product appears in buyer catalogue",
    catalog.status === 200 && catalog.payload.some((row) => row.id === productId),
  );

  const buyerAssistant = await call("/ai/command", {
    method: "POST",
    token: buyer.access_token,
    body: { text: "Find sarees below ₹5,000" },
  });
  check(
    "buyer accounts cannot access the merchant voice assistant",
    buyerAssistant.status === 403 && buyerAssistant.payload?.code === "ROLE_FORBIDDEN",
  );
  const buyerImageAnalysis = await call("/ai/analyze-image", {
    method: "POST",
    token: buyer.access_token,
    body: { image: "data:image/png;base64,AA==" },
  });
  check(
    "buyer accounts cannot access merchant product image analysis",
    buyerImageAnalysis.status === 403 && buyerImageAnalysis.payload?.code === "ROLE_FORBIDDEN",
  );

  const asked = await call("/buyer/requests", {
    method: "POST",
    token: buyer.access_token,
    body: {
      product_id: productId,
      request_type: "purchase",
      quantity: 1,
      message: "E2E temporary request",
    },
  });
  enquiryId = asked.payload?.id;
  check(
    "buyer request is stored against the product",
    asked.status === 201 &&
      asked.payload?.product_id === productId &&
      asked.payload?.status === "new",
  );

  const status = await call(`/admin/enquiries/${enquiryId}/status`, {
    method: "PUT",
    token: admin.access_token,
    body: { status: "responded", feedback: "E2E response" },
  });
  check(
    "admin can update enquiry status",
    status.status === 200 && status.payload?.status === "responded",
  );

  const [buyerRequests, artisanRequests, adminSummary] = await Promise.all([
    call("/buyer/requests", { token: buyer.access_token }),
    call("/enquiries", { token: merchant.access_token }),
    call("/admin/summary", { token: admin.access_token }),
  ]);
  check(
    "buyer sees updated request status",
    buyerRequests.status === 200 &&
      buyerRequests.payload.find((row) => row.id === enquiryId)?.status === "responded",
  );
  check(
    "artisan sees the incoming enquiry",
    artisanRequests.status === 200 && artisanRequests.payload.some((row) => row.id === enquiryId),
  );
  check(
    "admin statistics are database-backed",
    adminSummary.status === 200 &&
      Number.isInteger(adminSummary.payload?.artisans) &&
      Number.isInteger(adminSummary.payload?.pendingProducts),
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (enquiryId) {
    const { error } = await supabase.from("enquiries").delete().eq("id", enquiryId);
    if (error) {
      console.error("Could not clean up the temporary enquiry:", error.message);
      process.exitCode = 1;
    }
  }
  if (productId) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      console.error("Could not clean up the temporary product:", error.message);
      process.exitCode = 1;
    }
  }
  if (results.length) {
    const passed = results.filter((result) => result.passed).length;
    console.log(`\n${passed}/${results.length} checks passed`);
  }
}
