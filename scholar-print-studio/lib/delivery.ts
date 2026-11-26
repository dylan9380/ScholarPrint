export type DeliveryMethod = "local" | "shipped";

export type DeliveryDetails = {
  isLocal: boolean;
  deliveryMethod: DeliveryMethod;
  shippingCents: number;
  label: string;
  estimatedWindow: string;
};

const LOCAL_FSAS = new Set([
  "L1G", "L1H", "L1J", "L1K", "L1L", "L1N", "L1P", "L1R", "L1S", "L1T",
  "L1V", "L1W", "L1X", "L1Y", "L1Z",
  "L3P", "L3R", "L3S", "L3T",
  "L4B", "L4C", "L4E", "L4G", "L4H", "L4J", "L4K", "L4L", "L4S",
  "L4T", "L4V", "L4W", "L4X", "L4Y", "L4Z",
  "L6A", "L6B", "L6C", "L6E", "L6G", "L6H", "L6J", "L6K", "L6L", "L6M",
  "L7A",
  "N1C", "N1E", "N1G", "N1H", "N1K", "N1L", "N1M", "N1P", "N1R", "N1S",
  "N1T", "N2A", "N2B", "N2C", "N2E", "N2G", "N2H", "N2J", "N2K", "N2L",
  "N2M", "N2N", "N2P", "N2R", "N2T", "N2V", "N2Z", "N3A", "N3B", "N3C",
  "N3E", "N3H",
]);

function addFsaRange(prefix: string, start: string, end: string) {
  for (let code = start.charCodeAt(0); code <= end.charCodeAt(0); code += 1) {
    LOCAL_FSAS.add(`${prefix}${String.fromCharCode(code)}`);
  }
}

addFsaRange("L5", "A", "W");
addFsaRange("L6", "P", "Z");
addFsaRange("L7", "L", "T");

const CANADIAN_POSTAL_CODE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

export function normalizeCanadianPostalCode(postalCode: string): string {
  return postalCode.toUpperCase().replace(/\s/g, "");
}

export function getDeliveryDetails(postalCode: string): DeliveryDetails | null {
  const normalizedPostalCode = normalizeCanadianPostalCode(postalCode);
  if (!CANADIAN_POSTAL_CODE.test(normalizedPostalCode)) return null;

  const fsa = normalizedPostalCode.slice(0, 3);
  const isLocal = fsa.startsWith("M") || LOCAL_FSAS.has(fsa);

  return {
    isLocal,
    deliveryMethod: isLocal ? "local" : "shipped",
    shippingCents: isLocal ? 0 : 2000,
    label: isLocal
      ? "Free Local Delivery (GTA & Kitchener-Waterloo) — $0.00"
      : "Tracked Courier Tube Shipping (Canada-Wide) — $20.00",
    estimatedWindow: isLocal
      ? "Delivery timing is coordinated after your order."
      : "Tracking is provided after dispatch; transit time varies by destination.",
  };
}
