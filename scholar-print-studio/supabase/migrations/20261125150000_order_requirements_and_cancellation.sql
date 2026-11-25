alter table public.orders
  add column if not exists customer_name text;

create table if not exists public.order_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'cancelled', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists order_cancellation_requests_one_pending_per_order
  on public.order_cancellation_requests (order_id)
  where status = 'pending';

create index if not exists order_cancellation_requests_user_created_idx
  on public.order_cancellation_requests (user_id, created_at desc);

alter table public.order_cancellation_requests enable row level security;

drop policy if exists "order_cancellation_requests_select_own_or_admin"
  on public.order_cancellation_requests;
create policy "order_cancellation_requests_select_own_or_admin"
  on public.order_cancellation_requests
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

drop policy if exists "order_cancellation_requests_insert_own"
  on public.order_cancellation_requests;
create policy "order_cancellation_requests_insert_own"
  on public.order_cancellation_requests
  for insert with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.status not in ('cancelled', 'completed')
    )
  );

drop policy if exists "order_cancellation_requests_update_admin"
  on public.order_cancellation_requests;
create policy "order_cancellation_requests_update_admin"
  on public.order_cancellation_requests
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

grant select, insert, update on public.order_cancellation_requests to authenticated;

notify pgrst, 'reload schema';
