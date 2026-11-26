alter table public.orders
  add column if not exists delivery_address_line1 text,
  add column if not exists delivery_address_line2 text,
  add column if not exists delivery_city text,
  add column if not exists delivery_region text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_country text;

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
    new.conference := 'Psych389 University of Waterloo';
    new.delivery_address_line1 := null;
    new.delivery_address_line2 := null;
    new.delivery_city := null;
    new.delivery_region := null;
    new.delivery_postal_code := null;
    new.delivery_country := null;
  else
    new.promo_code := null;
    new.price_cents := 7999 * new.quantity;
    new.conference := null;
    new.delivery_address_line1 := nullif(btrim(coalesce(new.delivery_address_line1, '')), '');
    new.delivery_address_line2 := nullif(btrim(coalesce(new.delivery_address_line2, '')), '');
    new.delivery_city := nullif(btrim(coalesce(new.delivery_city, '')), '');
    new.delivery_region := nullif(btrim(coalesce(new.delivery_region, '')), '');
    new.delivery_postal_code := nullif(btrim(coalesce(new.delivery_postal_code, '')), '');
    new.delivery_country := nullif(btrim(coalesce(new.delivery_country, '')), '');

    if new.delivery_address_line1 is null
      or new.delivery_city is null
      or new.delivery_region is null
      or new.delivery_postal_code is null
      or new.delivery_country is null then
      raise exception 'A complete delivery address is required for standard orders';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
