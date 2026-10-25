/** Shared row -> API shape helpers so every endpoint returns identical JSON. */

export function toProduct(row) {
  const quantity = Number(row.quantity ?? 0);
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    category: row.category ?? "Craft",
    craft: row.craft ?? row.category ?? "Handmade",
    color: row.color ?? "Natural",
    materials: row.material ?? "Handmade materials",
    price: Number(row.price ?? 0),
    quantity,
    status: row.status ?? "listed",
    review_status: row.review_status ?? "approved",
    review_feedback: row.review_feedback ?? "",
    image: row.image_url ?? "",
    views: Number(row.views ?? 0),
    interest: Number(row.interest ?? 0),
    availability: availabilityText(row.status, quantity),
    created_at: row.created_at,
    updated_at: row.updated_at,
    artisan_name: row.artisans?.name ?? row.artisan_name ?? "",
    artisan_location: row.artisans?.location ?? row.artisan_location ?? "",
  };
}

function availabilityText(status, quantity) {
  if (status === "sold") return "Sold out";
  if (!quantity) return "Ask for availability";
  return `${quantity} piece${quantity === 1 ? "" : "s"} ready`;
}

export function toOrder(row, productName) {
  return {
    id: row.id,
    product_id: row.product_id,
    product: productName ?? "Product",
    buyer_name: row.buyer_name ?? "",
    quantity: Number(row.quantity ?? 0),
    amount: Number(row.amount ?? 0),
    status: row.status ?? "pending",
    created_at: row.created_at,
  };
}

export function toArtisan(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    language: row.language ?? "en",
    location: row.location ?? "",
    craft_type: row.craft_type ?? "",
    experience_years: Number(row.experience_years ?? 0),
    verification_status: row.verification_status ?? "pending",
    verification_feedback: row.verification_feedback ?? "",
    is_demo: Boolean(row.is_demo),
  };
}

export function toEnquiry(row) {
  const product = row.products ?? null;
  return {
    id: row.id,
    buyer_id: row.buyer_id,
    buyer_name: row.buyer_name ?? "",
    buyer_email: row.buyer_email ?? "",
    artisan_id: row.artisan_id,
    artisan_name: row.artisans?.name ?? "",
    product_id: row.product_id,
    product_name: product?.name ?? "Service request",
    product_image: product?.image_url ?? "",
    request_type: row.request_type,
    quantity: Number(row.quantity ?? 1),
    message: row.message ?? "",
    status: row.status ?? "new",
    admin_feedback: row.admin_feedback ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
