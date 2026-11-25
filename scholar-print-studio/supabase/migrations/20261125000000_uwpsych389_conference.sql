alter table public.orders
  add column if not exists conference text;

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

  if upper(coalesce(new.promo_code, '')) = 'UWPSYCH389' then
    new.promo_code := 'UWPsych389';
    new.price_cents := 3999 * new.quantity;
    if new.conference is null or new.conference not in ('CSBBCS') then
      raise exception 'Select a valid conference for the UWPsych389 promo code';
    end if;
  else
    new.promo_code := null;
    new.price_cents := 7999 * new.quantity;
    new.conference := null;
  end if;

  return new;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
