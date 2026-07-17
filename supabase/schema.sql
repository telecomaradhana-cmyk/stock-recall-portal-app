-- =========================================================
-- Stock & Recall Portal — Supabase schema
-- Run this once in Supabase Studio: SQL Editor > New query
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- ROLE ENUM ----------
do $$ begin
  create type user_role as enum ('admin', 'staff', 'viewer');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES (1:1 with auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up.
-- First user ever created is made admin automatically; everyone after is 'viewer'
-- until an admin promotes them from the Users page.
create or replace function handle_new_user()
returns trigger as $$
declare
  existing_count int;
begin
  select count(*) into existing_count from profiles;
  insert into profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    case when existing_count = 0 then 'admin' else 'viewer' end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  name text not null,
  category text,
  current_stock int not null default 0,
  reorder_level int not null default 5,
  price numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- RECALL BATCHES (one row per CSV upload) ----------
create table if not exists recall_batches (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('amazon', 'flipkart')),
  file_name text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  total_rows int not null default 0
);

-- ---------- RECALL / RETURN ITEMS ----------
create table if not exists recall_items (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid references recall_batches(id) on delete cascade,
  source text not null check (source in ('amazon', 'flipkart')),
  sku text not null,
  product_name text not null,
  quantity int not null default 1,
  reason text,
  order_id text,
  return_date date,
  status text not null default 'pending' check (status in ('pending','received','restocked','written_off')),
  created_at timestamptz not null default now()
);

create index if not exists idx_recall_items_batch on recall_items(batch_id);
create index if not exists idx_recall_items_sku on recall_items(sku);

-- ---------- STOCK MOVEMENTS (audit trail) ----------
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  change_type text not null check (change_type in ('recall_in','sale_out','manual_adjust','restock')),
  quantity int not null,
  reference_id uuid,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_product on stock_movements(product_id);

-- ---------- updated_at trigger for products ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute procedure set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table recall_batches enable row level security;
alter table recall_items enable row level security;
alter table stock_movements enable row level security;

-- Helper: current user's role
create or replace function current_role_name()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---- profiles ----
create policy "profiles: read own or admin reads all"
  on profiles for select
  using (id = auth.uid() or current_role_name() = 'admin');

create policy "profiles: admin can update roles"
  on profiles for update
  using (current_role_name() = 'admin');

create policy "profiles: user can update own name"
  on profiles for update
  using (id = auth.uid());

-- ---- products ----
create policy "products: any authenticated user can read"
  on products for select
  using (auth.uid() is not null);

create policy "products: admin/staff can write"
  on products for insert
  with check (current_role_name() in ('admin','staff'));

create policy "products: admin/staff can update"
  on products for update
  using (current_role_name() in ('admin','staff'));

create policy "products: admin can delete"
  on products for delete
  using (current_role_name() = 'admin');

-- ---- recall_batches ----
create policy "batches: any authenticated user can read"
  on recall_batches for select
  using (auth.uid() is not null);

create policy "batches: admin/staff can insert"
  on recall_batches for insert
  with check (current_role_name() in ('admin','staff'));

create policy "batches: admin can delete"
  on recall_batches for delete
  using (current_role_name() = 'admin');

-- ---- recall_items ----
create policy "items: any authenticated user can read"
  on recall_items for select
  using (auth.uid() is not null);

create policy "items: admin/staff can insert"
  on recall_items for insert
  with check (current_role_name() in ('admin','staff'));

create policy "items: admin/staff can update"
  on recall_items for update
  using (current_role_name() in ('admin','staff'));

create policy "items: admin can delete"
  on recall_items for delete
  using (current_role_name() = 'admin');

-- ---- stock_movements ----
create policy "movements: any authenticated user can read"
  on stock_movements for select
  using (auth.uid() is not null);

create policy "movements: admin/staff can insert"
  on stock_movements for insert
  with check (current_role_name() in ('admin','staff'));

-- =========================================================
-- Done. Next: Authentication > Providers > enable Email,
-- and turn OFF "Confirm email" for quicker internal testing
-- (or leave it on and use real addresses for your team).
-- =========================================================
