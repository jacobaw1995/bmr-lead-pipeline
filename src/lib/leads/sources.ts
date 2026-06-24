/** Standard pick-list — reps can also enter a custom source */
export const STANDARD_LEAD_SOURCES = [
  "Phone Call",
  "Yard Sign",
  "Website",
  "Facebook",
  "Referral",
  "Google",
  "Door Knock",
  "Home Show",
] as const;

export type StandardLeadSource = (typeof STANDARD_LEAD_SOURCES)[number];

export const CUSTOM_SOURCE_VALUE = "__custom__";

export function isStandardSource(
  value: string
): value is StandardLeadSource {
  return (STANDARD_LEAD_SOURCES as readonly string[]).includes(value);
}

export function resolveLeadSource(
  picked: string,
  customText?: string
): string | null {
  if (picked === CUSTOM_SOURCE_VALUE) {
    const custom = customText?.trim();
    return custom || null;
  }
  if (picked === "") return null;
  return picked.trim();
}

export function formatSourceLabel(source: string | null | undefined): string {
  if (!source?.trim()) return "Unknown";
  return source.trim();
}

/** Match CSV/import text to a standard source when possible */
export function normalizeImportedSource(raw: string | undefined): string {
  if (!raw?.trim()) return "Phone Call";
  const lower = raw.trim().toLowerCase();
  const match = STANDARD_LEAD_SOURCES.find(
    (s) => s.toLowerCase() === lower
  );
  if (match) return match;
  // legacy aliases
  if (lower === "manual") return "Phone Call";
  if (lower === "webhook") return "Website";
  return raw.trim();
}