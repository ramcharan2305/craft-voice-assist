# H-Connect

A voice-first marketplace that connects marginalised artisans with buyers,
using the existing React, Express, and Supabase stack.

## Current features

- Google sign-in for new buyers and merchants, with workspace selection at onboarding.
- Merchant workspace with product creation, editing, inventory, profile, and orders.
- Telugu and Indian English voice commands and product dictation using Sarvam
  Saaras v4; recognized text remains visible and listings stay editable.
- Merchant product listings appear in the buyer catalogue immediately, without
  product approval.
- Admin artisan verification and optional product moderation actions,
  with feedback, database-backed review statistics, and the ability to remove
  visible or demo listings. Pending reviews do not block listing visibility;
  rejected or changes-requested products and artisan profiles remain hidden.
- Buyer search, category filters, price limits such as “under ₹2,000,” direct
  purchases recorded as completed sales, product questions, service requests,
  and persistent purchase/request history.
- Voice/text assistant routes artisan product listings, sales orders, buyer
  enquiries, price questions, approved catalogue searches, and stored
  scheme/market records to existing project features.
- No payment is collected. Official-source opportunity crawling runs daily and
  can also be started by admins; crawled records are reviewed before recommendation.

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
   LLM_API_KEY=<server-only-Groq-compatible-key>
   LLM_BASE_URL=https://api.groq.com/openai/v1
   LLM_MODEL=<supported-model-name>
   DATABASE_URL=postgresql://...
   ```

   `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also accepted as
   legacy variable names. Never put the secret/service-role key in a frontend
   environment file. `SARVAM_API_KEY` and `LLM_API_KEY` must also stay in
   `backend/.env`; never add them to a `VITE_` variable or frontend environment
   file. `LLM_API_KEY` is required for structured opportunity extraction.

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
   schema setup adds product review state, artisan verification state,
   persistent buyer enquiries, buyer-linked purchase orders, merchant matching
   profile fields, and reviewed opportunity/crawl-history tables to the existing
   database.

5. Start the backend and frontend in separate terminals:

   ```bash
   # Terminal 1, from the repository root
   npm run dev --prefix backend

   # Terminal 2, from the repository root
   npm run dev
   ```

   Open <http://localhost:5173>. Vite proxies `/api` to the Express server at
   port 5000. Do not start a second backend on a port already in use.

   Backend start commands use Node's system certificate store so Node's
   HTTPS crawler can validate certificates installed in the operating system.
   The backend expects a Node version that supports `--use-system-ca`.

## End-to-end workflow

1. Sign in as the merchant, create a listing, dictate or type its description,
   check the editable fields, and submit it.
2. The listing appears in the buyer catalogue immediately; no product approval
   is required.
3. Admin verifies artisan accounts. Product moderation remains available but
   does not gate a merchant's new listing.
4. Sign in as buyer and find listed products using search, category, or price.
5. Buy a product to record a completed sale and update stock. Questions and
   service requests go to the merchant enquiry screen. Payment is not collected.
6. Merchants can complete location and business details in My profile to
   personalize the “Recommended for You” section. Admins can trigger a crawl,
   review source-backed opportunity records, and approve or remove them.

The backend opportunity crawler discovers candidate pages from a trusted list of
government, handloom, skills, textile and trade sources, using internal links
and available sitemaps. It obeys each source's `robots.txt`, skips sources that
refuse a readable policy or disallow AI input, limits requests to the source's
official hosts, and extracts structured scheme, training and market-linkage
details using the configured backend AI integration. Missing details remain
blank; crawled records retain their original source URL and crawl timestamps
and require admin review before they appear in recommendations. Admins can
trigger a crawl manually; scheduled runs occur daily. Re-run
`npm run db:setup` after updating to apply the additive opportunity schema.
Configured sources include handlooms.gov.in, myhandlooms.gov.in, india.gov.in,
nabard.org, skillindiadigital.gov.in, nsdcindia.org, nift.ac.in,
indiatradefair.com, texprocil.org and epch.in. A source may be skipped when its
robots policy disallows crawling/AI processing or cannot be read safely.

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
Supabase app metadata. New merchant accounts receive a pending artisan profile.
Their listed products appear in the buyer catalogue while the profile or listing
is pending review; rejected profiles and listings remain hidden.
Google users who already have an assigned role keep that role when signing in.
Admin access is not available through public Google onboarding; the existing
admin account remains managed separately.

## Deployment

The frontend is configured for Vercel through Nitro. Import the GitHub
repository with the repository root as the project root and `npm run build` as
the build command. Do not set a static output directory; Nitro generates
`.vercel/output` for Vercel.

The Express API in `backend/` must be deployed separately. Set
`VITE_API_URL` on Vercel to the deployed API origin ending in `/api`, and set
`CORS_ORIGIN` on the API to the Vercel site URL. Configure
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` on Vercel. Keep the
Supabase secret key and Sarvam/LLM credentials only in the backend environment.
Add the deployed site's `/auth/callback` URL to Supabase's allowed redirect
URLs.

## Environment variables

| Variable                        | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `PORT`                          | Express port; defaults to `5000`                                   |
| `SUPABASE_URL`                  | Supabase project URL                                               |
| `SUPABASE_PUBLISHABLE_KEY`      | Auth sign-in key; legacy `SUPABASE_ANON_KEY` is accepted           |
| `SUPABASE_SECRET_KEY`           | Server-only secret; legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted |
| `DATABASE_URL`                  | Supabase Postgres connection used by `npm run db:setup`            |
| `LLM_API_KEY`                   | Server-only key for AI parsing, opportunity extraction, and images  |
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
