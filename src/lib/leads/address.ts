import type { Lead } from "@/types/database";

export interface AddressInput {
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function normalizeAddress(input: AddressInput) {
  return {
    street_address: input.streetAddress?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    zip: input.zip?.trim() || null,
  };
}

export function formatFullAddress(
  lead: Pick<
    Lead,
    "address" | "street_address" | "city" | "state" | "zip"
  >
): string | null {
  const parts: string[] = [];

  if (lead.street_address) parts.push(lead.street_address);
  else if (lead.address) parts.push(lead.address);

  const cityStateZip = [
    lead.city,
    lead.state && lead.zip
      ? `${lead.state} ${lead.zip}`
      : lead.state || lead.zip,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityStateZip) parts.push(cityStateZip);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function mapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function formatCityState(
  lead: Pick<Lead, "city" | "state" | "zip">
): string | null {
  if (!lead.city && !lead.state && !lead.zip) return null;
  const line = [lead.city, lead.state].filter(Boolean).join(", ");
  return lead.zip ? `${line} ${lead.zip}`.trim() : line || null;
}