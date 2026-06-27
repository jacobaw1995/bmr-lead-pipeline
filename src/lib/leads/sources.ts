/** Standard pick-list — reps can also enter a custom source */
export const STANDARD_LEAD_SOURCES = [
  "Phone Call",
  "Google Maps",
  "Google Search",
  "Google Local Services",
  "Website",
  "Yard Sign",
  "Referral",
  "Facebook",
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

export const REFERRAL_SOURCE = "Referral";

export function formatSourceLabel(source: string | null | undefined): string {
  if (!source?.trim()) return "Unknown";
  return source.trim();
}

export function formatLeadSourceDisplay(lead: {
  source: string | null | undefined;
  referral_name?: string | null;
}): string {
  const source = formatSourceLabel(lead.source);
  if (source === REFERRAL_SOURCE && lead.referral_name?.trim()) {
    return `${REFERRAL_SOURCE} — ${lead.referral_name.trim()}`;
  }
  return source;
}

const SOURCE_ALIASES: Record<string, StandardLeadSource> = {
  google: "Google Search",
  "google maps": "Google Maps",
  "google map": "Google Maps",
  "google search": "Google Search",
  "google local services": "Google Local Services",
  "google local service": "Google Local Services",
  "google my business": "Google Maps",
  gmb: "Google Maps",
  manual: "Phone Call",
  webhook: "Website",
};

/** Map stored or imported text to a standard source when possible */
export function normalizeSourceText(raw: string | undefined): string {
  if (!raw?.trim()) return "Phone Call";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  const exact = STANDARD_LEAD_SOURCES.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;

  const alias = SOURCE_ALIASES[lower];
  if (alias) return alias;

  return trimmed;
}

export function sourceToPickerValues(source: string | null | undefined): {
  picked: string;
  customSource: string;
} {
  const trimmed = source?.trim() ?? "";
  if (!trimmed) return { picked: "Phone Call", customSource: "" };

  const normalized = normalizeSourceText(trimmed);
  if (isStandardSource(normalized)) {
    return { picked: normalized, customSource: "" };
  }
  return { picked: CUSTOM_SOURCE_VALUE, customSource: trimmed };
}

/** Match CSV/import text to a standard source when possible */
export function normalizeImportedSource(raw: string | undefined): string {
  return normalizeSourceText(raw);
}