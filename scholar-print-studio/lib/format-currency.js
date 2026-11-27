export function formatCAD(cents) {
  const amount = new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `CA$${amount}`;
}
