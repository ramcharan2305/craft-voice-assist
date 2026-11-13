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
alter table public.artisans add column if not exists age integer;
alter table public.artisans add column if not exists gender text not null default '';
alter table public.artisans add column if not exists state text not null default '';
alter table public.artisans add column if not exists district text not null default '';
alter table public.artisans add column if not exists city text not null default '';
alter table public.artisans add column if not exists product_category text not null default '';
alter table public.artisans add column if not exists business_size text not null default '';
alter table public.artisans add column if not exists payment_qr_url text not null default '';
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
  review_status text not null default 'approved'
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
alter table public.products alter column review_status set default 'approved';
alter table public.products add column if not exists review_feedback text not null default '';
alter table public.products add column if not exists review_reviewed_at timestamptz;
alter table public.products add column if not exists review_reviewed_by uuid references auth.users (id) on delete set null;
update public.products set review_status = 'approved' where review_status = 'pending';
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
  buyer_id    uuid references auth.users (id) on delete set null,
  buyer_name  text not null default '',
  quantity    integer not null default 1,
  amount      numeric(12, 2) not null default 0,
  status      text not null default 'pending'
              check (status in ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')),
  payment_status text not null default 'pending'
                check (payment_status in ('pending', 'submitted', 'verified', 'rejected')),
  payment_utr text not null default '',
  payment_screenshot text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.orders add column if not exists buyer_id uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists payment_utr text not null default '';
alter table public.orders add column if not exists payment_screenshot text not null default '';
create index if not exists orders_artisan_idx on public.orders (artisan_id);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);

create or replace function public.purchase_product(
  p_product_id uuid,
  p_buyer_id uuid,
  p_buyer_name text,
  p_quantity integer
)
returns table (
  id uuid,
  artisan_id uuid,
  product_id uuid,
  buyer_name text,
  quantity integer,
  amount numeric,
  status text,
  created_at timestamptz,
  product_name text,
  product_image text,
  artisan_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_row public.products%rowtype;
  order_row public.orders%rowtype;
  current_artisan_name text;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception using errcode = 'P0001', message = 'BUY_PRODUCT_INVALID_QUANTITY';
  end if;

  select p.*
    into product_row
    from public.products p
    join public.artisans a on a.id = p.artisan_id
   where p.id = p_product_id
     and p.status = 'listed'
     and p.review_status in ('pending', 'approved')
     and a.verification_status in ('pending', 'approved')
   for update of p;

  if not found or product_row.quantity < 1 then
    raise exception using errcode = 'P0001', message = 'BUY_PRODUCT_UNAVAILABLE';
  end if;
  if p_quantity > product_row.quantity then
    raise exception using
      errcode = 'P0001',
      message = 'BUY_PRODUCT_STOCK:' || product_row.quantity;
  end if;

  update public.products
     set quantity = product_row.quantity - p_quantity,
         status = case when product_row.quantity = p_quantity then 'sold' else 'listed' end,
         updated_at = now()
   where products.id = product_row.id;

  insert into public.orders (artisan_id, product_id, buyer_id, buyer_name, quantity, amount, status, payment_status, payment_utr, payment_screenshot)
  values (
    product_row.artisan_id,
    product_row.id,
    p_buyer_id,
    left(coalesce(nullif(trim(p_buyer_name), ''), 'Buyer'), 120),
    p_quantity,
    product_row.price * p_quantity,
    'pending',
    'pending',
    '',
    ''
  )
  returning * into order_row;

  select a.name into current_artisan_name
    from public.artisans a
   where a.id = product_row.artisan_id;

  return query
  select order_row.id, order_row.artisan_id, order_row.product_id, order_row.buyer_name,
         order_row.quantity, order_row.amount, order_row.status, order_row.created_at,
         product_row.name, product_row.image_url, current_artisan_name;
end;
$$;

revoke all on function public.purchase_product(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.purchase_product(uuid, uuid, text, integer) to service_role;

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

-- ----------------------------------------------------------- opportunities --
create table if not exists public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  normalized_title    text not null default '',
  category            text not null default 'GOVERNMENT_SCHEME',
  description         text not null default '',
  source_name         text not null,
  source_url          text not null unique,
  source_urls         text[] not null default '{}',
  location            text not null default '',
  content_language    text not null default '',
  business_category   text not null default '',
  product_category    text not null default '',
  opportunity_type    text not null default 'other',
  provider            text,
  target_audience     text,
  eligibility_requirements text,
  benefits            text,
  fees                text,
  start_date          date,
  application_url     text,
  application_procedure text,
  duration            text,
  delivery_mode       text,
  certification       text,
  event_date          date,
  venue               text,
  accepted_products   text,
  buyer_details       text,
  experience_min      integer,
  age_min             integer,
  age_max             integer,
  gender_eligibility  text not null default '',
  eligibility_text    text not null default '',
  deadline            date,
  last_checked_at     timestamptz not null default now(),
  last_crawled_at     timestamptz not null default now(),
  last_verified_at    timestamptz,
  status              text not null default 'unverified'
                      check (status in ('active', 'expired', 'unverified')),
  review_status       text not null default 'pending'
                      check (review_status in ('pending', 'approved', 'rejected')),
  is_removed          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.opportunities add column if not exists normalized_title text not null default '';
alter table public.opportunities add column if not exists category text not null default 'GOVERNMENT_SCHEME';
alter table public.opportunities add column if not exists source_urls text[] not null default '{}';
alter table public.opportunities add column if not exists provider text;
alter table public.opportunities add column if not exists target_audience text;
alter table public.opportunities add column if not exists eligibility_requirements text;
alter table public.opportunities add column if not exists benefits text;
alter table public.opportunities add column if not exists fees text;
alter table public.opportunities add column if not exists start_date date;
alter table public.opportunities add column if not exists application_url text;
alter table public.opportunities add column if not exists application_procedure text;
alter table public.opportunities add column if not exists duration text;
alter table public.opportunities add column if not exists delivery_mode text;
alter table public.opportunities add column if not exists certification text;
alter table public.opportunities add column if not exists event_date date;
alter table public.opportunities add column if not exists venue text;
alter table public.opportunities add column if not exists accepted_products text;
alter table public.opportunities add column if not exists buyer_details text;
alter table public.opportunities add column if not exists experience_min integer;
alter table public.opportunities add column if not exists last_crawled_at timestamptz not null default now();
alter table public.opportunities add column if not exists last_verified_at timestamptz;
alter table public.opportunities add column if not exists status text not null default 'unverified';
alter table public.opportunities add column if not exists is_removed boolean not null default false;

update public.opportunities
set normalized_title = trim(
  both '-' from regexp_replace(
    regexp_replace(lower(title), '&', ' and ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  )
)
where normalized_title = '';
update public.opportunities
set category = case
  when opportunity_type in ('training', 'course') then 'COURSE_OR_TRAINING'
  when opportunity_type in ('market', 'exhibition') then 'MARKET_LINKAGE'
  when category in ('GOVERNMENT_SCHEME', 'COURSE_OR_TRAINING', 'MARKET_LINKAGE') then category
  else 'GOVERNMENT_SCHEME'
end
where opportunity_type in ('scheme', 'training', 'course', 'market', 'exhibition')
  or category not in ('GOVERNMENT_SCHEME', 'COURSE_OR_TRAINING', 'MARKET_LINKAGE');
update public.opportunities set source_urls = array[source_url] where cardinality(source_urls) = 0;
update public.opportunities
set status = case
  when event_date < current_date or deadline < current_date then 'expired'
  when review_status = 'approved' then 'active'
  else 'unverified'
end;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_category_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_category_check
      check (category in ('GOVERNMENT_SCHEME', 'COURSE_OR_TRAINING', 'MARKET_LINKAGE'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_status_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_status_check
      check (status in ('active', 'expired', 'unverified'));
  end if;
end $$;

alter table public.opportunities enable row level security;
drop policy if exists "public read approved opportunities" on public.opportunities;
create policy "public read approved opportunities" on public.opportunities
  for select using (review_status = 'approved' and is_removed = false and status = 'active');

create index if not exists opportunities_review_deadline_idx
  on public.opportunities (review_status, deadline);
create index if not exists opportunities_last_checked_idx
  on public.opportunities (last_checked_at desc);
create index if not exists opportunities_normalized_title_idx
  on public.opportunities (normalized_title, category);
create index if not exists opportunities_category_status_idx
  on public.opportunities (category, status, review_status);

create table if not exists public.opportunity_crawl_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  status       text not null default 'running'
               check (status in ('running', 'completed', 'partial', 'failed')),
  sites_checked integer not null default 0,
  records_found integer not null default 0,
  records_added integer not null default 0,
  errors       jsonb not null default '[]'::jsonb
);
alter table public.opportunity_crawl_runs enable row level security;

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