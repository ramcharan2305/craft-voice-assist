-- H-Connect database schema.
-- Run this once in Supabase -> SQL Editor, then run `npm run seed` in backend/.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- artisans --
create table if not exists public.artisans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users (id) on delete set null,
  name              text not null default '',
  phone             text not null default '',
  language          text not null default 'en',
  location          text not null default '',
  craft_type        text not null default '',
  experience_years  integer not null default 0,
  verification_status text not null default 'pending'
                    check (verification_status in ('pending', 'approved', 'rejected', 'changes_requested')),
  verification_feedback text not null default '',
  verification_reviewed_at timestamptz,
  verification_reviewed_by uuid references auth.users (id) on delete set null,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.artisans add column if not exists verification_status text not null default 'pending';
alter table public.artisans add column if not exists verification_feedback text not null default '';
alter table public.artisans add column if not exists verification_reviewed_at timestamptz;
alter table public.artisans add column if not exists verification_reviewed_by uuid references auth.users (id) on delete set null;
update public.artisans set verification_status = 'approved' where is_demo and verification_status = 'pending';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artisans_verification_status_check') then
    alter table public.artisans add constraint artisans_verification_status_check
      check (verification_status in ('pending', 'approved', 'rejected', 'changes_requested'));
  end if;
end $$;

-- ---------------------------------------------------------------- products --
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans (id) on delete cascade,
  name         text not null,
  description  text not null default '',
  category     text not null default 'Craft',
  craft        text not null default 'Handmade',
  material     text not null default '',
  color        text not null default '',
  price        numeric(12, 2) not null default 0,
  quantity     integer not null default 1,
  image_url    text not null default '',
  status       text not null default 'listed' check (status in ('listed', 'draft', 'sold')),
  review_status text not null default 'pending'
                check (review_status in ('pending', 'approved', 'rejected', 'changes_requested')),
  review_feedback text not null default '',
  review_reviewed_at timestamptz,
  review_reviewed_by uuid references auth.users (id) on delete set null,
  views        integer not null default 0,
  interest     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.products add column if not exists review_status text not null default 'pending';
alter table public.products add column if not exists review_feedback text not null default '';
alter table public.products add column if not exists review_reviewed_at timestamptz;
alter table public.products add column if not exists review_reviewed_by uuid references auth.users (id) on delete set null;
update public.products set review_status = 'approved' where status = 'listed' and review_status = 'pending';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_review_status_check') then
    alter table public.products add constraint products_review_status_check
      check (review_status in ('pending', 'approved', 'rejected', 'changes_requested'));
  end if;
end $$;

create index if not exists products_artisan_idx on public.products (artisan_id);
create index if not exists products_catalog_idx on public.products (review_status, status, category);

-- -------------------------------------------------------------- enquiries --
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users (id) on delete set null,
  buyer_name text not null,
  buyer_email text not null default '',
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  request_type text not null check (request_type in ('purchase', 'question', 'service')),
  quantity integer not null default 1 check (quantity > 0),
  message text not null default '',
  status text not null default 'new'
         check (status in ('new', 'in_progress', 'responded', 'closed')),
  admin_feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_buyer_idx on public.enquiries (buyer_id, created_at desc);
create index if not exists enquiries_artisan_idx on public.enquiries (artisan_id, status, created_at desc);
create index if not exists enquiries_status_idx on public.enquiries (status, created_at desc);

-- ------------------------------------------------------------------ orders --
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  buyer_name  text not null default '',
  quantity    integer not null default 1,
  amount      numeric(12, 2) not null default 0,
  status      text not null default 'pending'
              check (status in ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')),
  created_at  timestamptz not null default now()
);

create index if not exists orders_artisan_idx on public.orders (artisan_id);

-- ----------------------------------------------------------------- schemes --
create table if not exists public.schemes (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text not null default '',
  eligibility         text not null default '',
  benefits            text not null default '',
  application_process text not null default '',
  official_url        text not null default '',
  is_demo             boolean not null default true,
  created_at          timestamptz not null default now()
);

-- -------------------------------------------------------- training_resources --
create table if not exists public.training_resources (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  category    text not null default '',
  level       text not null default 'Beginner',
  language    text not null default 'English',
  url         text not null default '',
  is_demo     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------- market_insights --
create table if not exists public.market_insights (
  id               uuid primary key default gen_random_uuid(),
  product_category text not null,
  region           text not null default '',
  demand           text not null default '',
  price_range      text not null default '',
  trend            text not null default '',
  source           text not null default '',
  is_demo          boolean not null default true,
  created_at       timestamptz not null default now()
);

-- -------------------------------------------------------------------- RLS --
-- The backend uses the service role key and enforces ownership itself, so the
-- tables stay closed to direct browser access. Open these policies only if you
-- later add a direct-to-Supabase client.
alter table public.artisans           enable row level security;
alter table public.products           enable row level security;
alter table public.orders             enable row level security;
alter table public.enquiries          enable row level security;
alter table public.schemes            enable row level security;
alter table public.training_resources enable row level security;
alter table public.market_insights    enable row level security;

drop policy if exists "artisans read own" on public.artisans;
create policy "artisans read own" on public.artisans
  for select using (auth.uid() = user_id);

drop policy if exists "products own" on public.products;
create policy "products own" on public.products
  for all using (
    exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid())
  );

drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders
  for all using (
    exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid())
  );

drop policy if exists "enquiries buyer or artisan read" on public.enquiries;
create policy "enquiries buyer or artisan read" on public.enquiries
  for select using (
    auth.uid() = buyer_id
    or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid())
  );

drop policy if exists "public read schemes" on public.schemes;
create policy "public read schemes" on public.schemes for select using (true);

drop policy if exists "public read training" on public.training_resources;
create policy "public read training" on public.training_resources for select using (true);

drop policy if exists "public read market" on public.market_insights;
create policy "public read market" on public.market_insights for select using (true);