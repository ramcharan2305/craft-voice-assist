# H-Connect

A voice-first marketplace that connects marginalised artisans with buyers,
using the existing React, Express, and Supabase stack.

## Current features

- Merchant workspace with product creation, editing, inventory, profile, and orders.
- Voice or typed product descriptions; speech recognition is browser-based and
  the resulting listing remains editable before submission.
- Product submissions require admin review before appearing in the buyer catalogue.
- Admin artisan verification, product approve/reject/corrections actions, feedback,
  buyer enquiry management, and database-backed statistics.
- Buyer search, category filters, price limits such as “under ₹2,000,” product
  questions, purchase requests, service requests, and persistent request history.
- Voice/text assistant searches approved products and stored scheme/market records.
- No payment is collected. Web crawling is deferred; market and scheme pages are
  not live event feeds.

## Demo accounts

Sign in at `/login`. Local demo accounts use the password `hconnect123`.

| Workspace | Email |
| --- | --- |
| Merchant | `lakshmi@hconnect.app` |
| Buyer | `buyer@hconnect.app` |
| Admin | `admin@hconnect.app` |

These are demo credentials; rotate them before deployment.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TanStack Start, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express 4 |
| Database and auth | Supabase PostgreSQL and Supabase Auth |
| Speech | Browser SpeechRecognition and SpeechSynthesis |
| Optional assistant | OpenAI-compatible API; core catalogue search works without a paid AI key |

The browser never receives the Supabase service-role key. The Express API
validates the signed-in role and ownership before database changes. Supabase
tables use Row Level Security; API requests that need privileged reads/writes
are restricted by backend role checks.

## Setup

1. Install the root and backend dependencies:

   ```bash
   npm install
   cd backend
   npm install
   ```

2. Configure `backend/.env` (copy `backend/.env.example`) with:

   ```dotenv
   PORT=5000
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   SUPABASE_SECRET_KEY=<server-only-secret-or-service-role-key>
   DATABASE_URL=postgresql://...
   ```

   `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also accepted as
   legacy variable names. Never put the secret/service-role key in a frontend
   environment file.

3. Apply the schema and create demo data/accounts:

   ```bash
   cd backend
   npm run db:setup
   npm run seed
   npm run seed:accounts
   ```

   Alternatively, run `backend/sql/schema.sql` in Supabase SQL Editor. The
   schema setup adds product review state, artisan verification state, and
   persistent buyer enquiries to the existing tables.

4. Start the backend and frontend in separate terminals:

   ```bash
   # Terminal 1, from the repository root
   npm run dev --prefix backend

   # Terminal 2, from the repository root
   npm run dev
   ```

   Open <http://localhost:5173>. Vite proxies `/api` to the Express server at
   port 5000. Do not start a second backend on a port already in use.

## End-to-end workflow

1. Sign in as the merchant, create a listing, dictate or type its description,
   check the editable fields, and submit it.
2. The listing is saved as pending and is visible to the artisan but not buyers.
3. Sign in as admin, review artisan/product submissions, and approve or provide
   feedback for corrections/rejection.
4. Sign in as buyer and find approved listings using search, category, or price.
5. Send a purchase request or question. It appears in buyer request history,
   the merchant enquiry screen, and the admin enquiry view.

The assistant can also answer catalogue queries such as “Find sarees below
₹2,000” and “Tell me about Blue Cotton Saree.” Voice input needs a compatible
browser and microphone permission; text input is available as a fallback.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port; defaults to `5000` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Auth sign-in key; legacy `SUPABASE_ANON_KEY` is accepted |
| `SUPABASE_SECRET_KEY` | Server-only secret; legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted |
| `DATABASE_URL` | Supabase Postgres connection used by `npm run db:setup` |
| `LLM_API_KEY` | Optional server-side key for extra AI parsing and image analysis |
| `LLM_BASE_URL` | Optional OpenAI-compatible API base URL |
| `LLM_MODEL` | Optional model identifier |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |

## Validation

```bash
npm exec -- tsc --noEmit
npm exec -- eslint -- src/routes/admin.tsx src/routes/user.tsx src/routes/buyers.tsx
```

The backend integration workflow uses Supabase: create a merchant listing,
approve it as admin, send a buyer request, and check the updated status across
workspaces.

## Limitations

- Purchase requests are not payments or confirmed orders.
- Crawling of government sites and live exhibition/opportunity feeds has not
  been implemented.
- Speech recognition availability depends on browser support and permission.
- Demo accounts and sample reference content are for local demonstration, not
  production access control or verified live market information.
