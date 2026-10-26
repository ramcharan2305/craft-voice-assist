import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ACCOUNT = { email: "admin@hconnect.app", role: "admin", name: "H Connect Admin" };
const RETIRED_DEMO_EMAILS = [
  "buyer@hconnect.app",
  "ravi@hconnect.app",
  "meera@hconnect.app",
  "suresh@hconnect.app",
  "anjali@hconnect.app",
];

if (!url || !secretKey) {
  console.error("Missing Supabase URL or server secret key. Check backend/.env.");
  process.exit(1);
}

const supabase = createClient(url, secretKey);

async function ensureAccount({ email, role, name }) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: "hconnect123",
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
  if (!existing)
    throw new Error(`Supabase reported ${email} already exists but did not return it.`);

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      app_metadata: { ...existing.app_metadata, role },
      user_metadata: { ...existing.user_metadata, name },
    },
  );
  if (updateError) throw updateError;
  return updated.user;
}

await ensureAccount(ADMIN_ACCOUNT);
console.log(`Ready: admin account (${ADMIN_ACCOUNT.email})`);

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;
for (const email of RETIRED_DEMO_EMAILS) {
  const user = listed.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user) continue;
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
  console.log(`Removed obsolete demo login (${email}); existing marketplace records are retained.`);
}
