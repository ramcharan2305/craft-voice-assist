import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = "hconnect123";
const ACCOUNTS = [
  { email: "admin@hconnect.app", role: "admin", name: "H Connect Admin" },
  { email: "buyer@hconnect.app", role: "buyer", name: "Demo Buyer" },
];

if (!url || !secretKey) {
  console.error("Missing Supabase URL or server secret key. Check backend/.env.");
  process.exit(1);
}

const supabase = createClient(url, secretKey);

async function ensureAccount({ email, role, name }) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { name },
  });

  if (!createError) return created.user;
  if (!createError.message.toLowerCase().includes("already")) throw createError;

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email?.toLowerCase() === email);
  if (!existing) throw new Error(`Supabase reported ${email} already exists but did not return it.`);

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password: DEMO_PASSWORD,
    app_metadata: { ...existing.app_metadata, role },
    user_metadata: { ...existing.user_metadata, name },
    email_confirm: true,
  });
  if (updateError) throw updateError;
  return updated.user;
}

for (const account of ACCOUNTS) {
  await ensureAccount(account);
  console.log(`Ready: ${account.role} demo account (${account.email})`);
}

console.log(`Demo password for both accounts: ${DEMO_PASSWORD}`);
