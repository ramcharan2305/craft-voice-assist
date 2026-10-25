import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { supabaseConfigured } from "../db.js";

/**
 * Reference content (schemes, training, market figures) lives in one JSON file.
 *
 * When Supabase is configured the database is the source of truth. When it is
 * not, the same rows are served from this file so the app is still usable, and
 * every response is marked as sample data.
 */
const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, "..", "data", "reference.json"), "utf8"));

export const REFERENCE_SCHEMES = raw.schemes.map((row, index) => ({
  id: `ref-scheme-${index + 1}`,
  name: row[0],
  description: row[1],
  eligibility: row[2],
  benefits: row[3],
  application_process: row[4],
  official_url: row[5],
  is_demo: true,
}));

export const REFERENCE_TRAINING = raw.training.map((row, index) => ({
  id: `ref-training-${index + 1}`,
  title: row[0],
  description: row[1],
  category: row[2],
  level: row[3],
  language: row[4],
  url: row[5],
  is_demo: true,
}));

export const REFERENCE_MARKET = raw.market.map((row, index) => ({
  id: `ref-market-${index + 1}`,
  product_category: row[0],
  region: row[1],
  demand: row[2],
  price_range: row[3],
  trend: row[4],
  source: row[5],
  is_demo: true,
}));

/** Case-insensitive "does any of these fields contain the search text" filter. */
export function matches(row, query, fields) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return fields.some((field) => String(row[field] ?? "").toLowerCase().includes(needle));
}

export const usingReferenceData = !supabaseConfigured;