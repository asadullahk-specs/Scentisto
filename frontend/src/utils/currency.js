/**
 * Currency utilities for SCENTISTO (PKR / Rs.)
 */

export function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (isNaN(num)) return "";
  const rounded = Math.round(num);
  if (rounded < 0) {
    return `-Rs. ${Math.abs(rounded).toLocaleString("en-PK")}`;
  }
  return `Rs. ${rounded.toLocaleString("en-PK")}`;
}

export const formatCurrency = formatPrice;
