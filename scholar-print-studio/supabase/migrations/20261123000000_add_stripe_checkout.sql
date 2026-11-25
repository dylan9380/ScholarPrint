alter table public.orders
  add column if not exists payment_status text not null default 'not_applicable',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists promo_code text;

alter table public.orders alter column status set default 'awaiting_payment';
alter table public.orders alter column payment_status set default 'unpaid';

create unique index if not exists orders_stripe_checkout_session_id_uidx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.set_order_checkout_defaults()
returns trigger as $$
begin
  if new.quantity is null or new.quantity < 1 or new.quantity > 20 then
    raise exception 'Order quantity must be between 1 and 20';
  end if;

  new.width_in := 36;
  new.height_in := 48;
  new.material := 'matte';
  new.rush := false;
  new.payment_status := 'unpaid';
  new.status := 'awaiting_payment';
  new.stripe_checkout_session_id := null;

  if upper(coalesce(new.promo_code, '')) = 'LYDIA40' then
    new.promo_code := 'Lydia40';
    new.price_cents := 4000 * new.quantity;
  else
    new.promo_code := null;
    new.price_cents := 7000 * new.quantity;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_checkout_defaults on public.orders;
create trigger orders_checkout_defaults
  before insert on public.orders
  for each row execute function public.set_order_checkout_defaults();

drop policy if exists "orders_update_own_or_admin" on public.orders;
drop policy if exists "orders_update_admin_only" on public.orders;
create policy "orders_update_admin_only" on public.orders
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
