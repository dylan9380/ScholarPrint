-- ============================================================
-- Scholar Print Studio — database schema
-- Run this once in the Supabase SQL editor (SQL Editor > New query)
-- ============================================================

-- Every signed-up user gets a matching profile row.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Automatically create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Orders
-- ------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled poster',
  width_in numeric not null,
  height_in numeric not null,
  material text not null default 'matte',
  quantity int not null default 1,
  rush boolean not null default false,
  status text not null default 'submitted',
  price_cents int,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Customers see their own orders. Admins (is_admin = true) see everything.
create policy "orders_select_own_or_admin" on public.orders
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_update_own_or_admin" on public.orders
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ------------------------------------------------------------
-- Order files
-- ------------------------------------------------------------
create table public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.order_files enable row level security;

create policy "order_files_select_own_or_admin" on public.order_files
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_files.order_id
      and (o.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
    )
  );

create policy "order_files_insert_own" on public.order_files
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_files.order_id and o.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Storage bucket for uploaded poster files (private — not public)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('poster-files', 'poster-files', false);

-- Files are stored as "<user_id>/<order_id>/<filename>" — this checks
-- that the first folder in the path matches the uploader's own id.
create policy "poster_files_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'poster-files' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "poster_files_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'poster-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- ------------------------------------------------------------
-- To make yourself an admin later (after you've signed up once):
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- ------------------------------------------------------------
