/**
 * Applies backend/sql/schema.sql to the Supabase Postgres database.
 *
 *   cd backend && npm run db:setup
 *
 * Uses DATABASE_URL from backend/.env. If you prefer the Supabase SQL editor,
 * just paste sql/schema.sql there instead and skip this script.
 */
import "dotenv/config";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL. Add it to backend/.env or run sql/schema.sql in the Supabase SQL editor.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "schema.sql"), "utf8");

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied. Next: npm run seed");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}