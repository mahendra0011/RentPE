export function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function priceShort(value) {
  return `₹${(Number(value) / 1000).toFixed(1)}k`;
}
