# H-Connect

A voice-first marketplace that connects marginalised artisans with buyers,
using the existing React, Express, and Supabase stack.

## Current features

- Google sign-in for new buyers and merchants, with workspace selection at onboarding.
- Merchant workspace with product creation, editing, inventory, profile, and orders.
- Telugu and Indian English voice commands and product dictation using Sarvam
  Saaras v4; recognized text remains visible and listings stay editable.
- Product submissions require admin review before appearing in the buyer catalogue.
- Admin artisan verification and product approve/reject/corrections actions,
  with feedback, database-backed review statistics, and the ability to remove
  approved or demo listings.
- Buyer search, category filters, price limits such as “under ₹2,000,” product
  questions, purchase requests, service requests, and persistent request history.
- Voice/text assistant routes artisan product listings, sales orders, buyer
  enquiries, price questions, approved catalogue searches, and stored
  scheme/market records to existing project features.
- No payment is collected. Web crawling is deferred; market and scheme pages are
  not live event feeds.

## Demo accounts

Sign in at `/login`. New buyers and merchants choose a workspace and continue
with Google. Existing demo accounts use the password `hconnect123`.

| Workspace | Email                  |
| --------- | ---------------------- |
| Merchant  | `lakshmi@hconnect.app` |
| Admin     | `admin@hconnect.app`   |

These are the only demo logins provisioned by the seed scripts. New users create
their own buyer or merchant account with Google.
Running `npm run seed:accounts --prefix backend` removes the old demo buyer and
extra artisan logins while retaining their existing database records.

## Stack

| Layer              | Technology                                                               |
| ------------------ | ------------------------------------------------------------------------ |
| Frontend           | React 19, TanStack Start, Vite, Tailwind CSS v4                          |
| Backend            | Node.js, Express 4                                                       |
| Database and auth  | Supabase PostgreSQL and Supabase Auth                                    |
| Speech             | Sarvam Saaras v4, Mayura v1 translation, and Bulbul v3 (`shubh`)         |
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
   SARVAM_API_KEY=<server-only-Sarvam-key>
   DATABASE_URL=postgresql://...
   ```

   `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also accepted as
   legacy variable names. Never put the secret/service-role key in a frontend
   environment file. `SARVAM_API_KEY` must also stay in `backend/.env`; never
   add it to a `VITE_` variable or frontend environment file.

3. Configure frontend Google sign-in by copying the root `.env.example` to `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   ```

   In Supabase Authentication, enable Google and provide the Google OAuth
   client ID and secret. Add
   `https://<project-ref>.supabase.co/auth/v1/callback` to the Google OAuth
   client's authorized redirect URIs. Add your app URL and
   `http://localhost:5173/auth/callback` to Supabase's allowed redirect URLs.
   Restart Vite after setting these values.

4. Apply the schema and create the retained demo data/accounts:

   ```bash
   cd backend
   npm run db:setup
   npm run seed
   npm run seed:accounts
   ```

   Alternatively, run `backend/sql/schema.sql` in Supabase SQL Editor. The
   schema setup adds product review state, artisan verification state, and
   persistent buyer enquiries to the existing tables.

5. Start the backend and frontend in separate terminals:

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
5. Send a purchase request or question. It goes directly to the merchant and
   appears in buyer request history and the merchant enquiry screen. Admin is
   only involved in artisan verification and product-listing review.

The assistant understands natural-language requests in Telugu and English
(India), including showing the artisan's products, opening the product listing
flow, viewing completed/shipped orders, and opening actual buyer enquiries.
When no saved listing price is available, price help collects the product,
material cost, labour cost (or hours and the artisan's hourly rate), and the
artisan's chosen profit percentage before calculating a cost-based estimate.
It does not invent costs, labour rates, or profit margins. It also searches the
approved catalogue, stored schemes, and market records. “Show sales” reports
recorded order values; H-Connect does not collect or verify payments.

Voice input records a short microphone clip in the browser and sends it to the
authenticated backend for Sarvam Saaras v4 transcription. Telugu commands and
responses use Sarvam Mayura translation; spoken replies and voice previews use
Bulbul v3's Shubh speaker in the selected `te-IN` or `en-IN` language. Text
remains available if translation or voice playback fails. Microphone access
requires browser permission and a secure context (HTTPS or localhost).
Selecting Telugu also translates the assistant, primary navigation, and the
home and products screens. The assistant shows Telugu example commands when
Telugu is selected.

Google onboarding stores the selected buyer/merchant role in server-controlled
Supabase app metadata. New merchant accounts receive a pending artisan profile
and must be verified before their products appear in the buyer catalogue.
Google users who already have an assigned role keep that role when signing in.
Admin access is not available through public Google onboarding; the existing
admin account remains managed separately.

## Environment variables

| Variable                        | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `PORT`                          | Express port; defaults to `5000`                                   |
| `SUPABASE_URL`                  | Supabase project URL                                               |
| `SUPABASE_PUBLISHABLE_KEY`      | Auth sign-in key; legacy `SUPABASE_ANON_KEY` is accepted           |
| `SUPABASE_SECRET_KEY`           | Server-only secret; legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted |
| `DATABASE_URL`                  | Supabase Postgres connection used by `npm run db:setup`            |
| `LLM_API_KEY`                   | Optional server-side key for extra AI parsing and image analysis   |
| `SARVAM_API_KEY`                | Server-only Sarvam key for speech, translation, and text-to-speech |
| `LLM_BASE_URL`                  | Optional OpenAI-compatible API base URL                            |
| `LLM_MODEL`                     | Optional model identifier                                          |
| `CORS_ORIGIN`                   | Comma-separated allowed browser origins                            |
| `VITE_SUPABASE_URL`             | Frontend Supabase URL used to start Google OAuth                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend-safe key used to start Google OAuth                       |

## Validation

```bash
npm exec -- tsc --noEmit
npm exec -- eslint -- src/routes/admin.tsx src/routes/user.tsx src/routes/buyers.tsx
```

The backend integration workflow uses Supabase: create a merchant listing,
approve it as admin, send a buyer request, let the merchant update its status,
and check that status in the buyer and merchant workspaces.

## Limitations

- Purchase requests are not payments or confirmed orders.
- Google login requires enabling the Google provider and registering the correct
  OAuth redirect URLs in Supabase and Google Cloud.
- Crawling of government sites and live exhibition/opportunity feeds has not
  been implemented.
- Voice requires a configured Sarvam API key, browser microphone support, and
  microphone permission. Typed commands remain available when voice fails.
- Order values are not proof of received payments; monthly sales and payment
  tracking are not implemented.
- Remaining demo records and sample reference content are for demonstration,
  not verified live market information.
