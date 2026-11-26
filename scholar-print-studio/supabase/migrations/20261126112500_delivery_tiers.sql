alter table public.orders
  add column if not exists delivery_method text default 'local',
  add column if not exists shipping_cost_cents integer default 0,
  add column if not exists tracking_number text;

notify pgrst, 'reload schema';
