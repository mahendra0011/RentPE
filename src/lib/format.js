export function formatPrice(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function priceShort(value) {
  return `₹${(Number(value) / 1000).toFixed(1)}k`;
}
