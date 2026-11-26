export function formatDeliveryAddress(order) {
  const locality = [order.delivery_city, order.delivery_region].filter(Boolean).join(", ");
  const cityAndPostal = [locality, order.delivery_postal_code].filter(Boolean).join(" ");

  return [
    order.delivery_address_line1,
    order.delivery_address_line2,
    cityAndPostal,
    order.delivery_country,
  ]
    .filter(Boolean)
    .join(", ");
}
