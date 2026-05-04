-- 001_initial-migration.sql
-- Checkpoint: drop dependent objects first, then recreate schema (Supabase / PostgreSQL).

create extension if not exists "pgcrypto";

---------------------------------------------------------------------------
-- Checkpoint: remove existing tables (CASCADE drops FKs + triggers).
-- Safe if nothing exists yet.
---------------------------------------------------------------------------
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.customers cascade;

drop function if exists public.set_updated_at() cascade;

---------------------------------------------------------------------------
-- Customers (1:1 with Supabase Auth)
---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Categories
---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Products
---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  price numeric not null,
  social_media_url text,
  external_shopping_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Product images
---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Orders
---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  total_amount numeric not null,
  created_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Order line items
---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null check (quantity > 0),
  price numeric not null
);

---------------------------------------------------------------------------
-- Indexes
---------------------------------------------------------------------------
create index orders_customer_id_idx on public.orders (customer_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index product_images_product_id_idx on public.product_images (product_id);
create index products_category_id_idx on public.products (category_id);

---------------------------------------------------------------------------
-- updated_at triggers (products + product_images)
---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute procedure public.set_updated_at();

create trigger product_images_set_updated_at
  before update on public.product_images
  for each row
  execute procedure public.set_updated_at();

---------------------------------------------------------------------------
-- Row level security (enable; tune policies in a follow-up migration)
---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
