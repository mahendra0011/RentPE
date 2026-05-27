export const roomRuleSuggestions = [
  "No smoking",
  "ID proof required",
  "No loud music after 10 PM",
  "Visitors allowed with permission",
  "Rent due by 5th of every month",
];

export function addRuleLine(value, rule) {
  const rules = String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!rules.some((item) => item.toLowerCase() === rule.toLowerCase())) {
    rules.push(rule);
  }

  return rules.join("\n");
}
