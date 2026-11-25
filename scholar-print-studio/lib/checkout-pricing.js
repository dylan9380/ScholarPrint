export const STANDARD_UNIT_PRICE_CENTS = 7999;
export const PROMO_UNIT_PRICE_CENTS = 3999;
export const PROMO_CODE = "UWPsych389";
export const CONFERENCE_OPTIONS = ["CSBBCS"];

export function isPromoCode(value) {
  return typeof value === "string" && value.trim().toUpperCase() === PROMO_CODE.toUpperCase();
}
