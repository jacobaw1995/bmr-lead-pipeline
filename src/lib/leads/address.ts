import {
  formatAddressFromParts,
  getBillingAddressParts,
  getServiceAddressParts,
} from "@/lib/leads/profile";
export interface AddressInput {
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** @deprecated Use profile helpers — kept for legacy callers */
export function normalizeAddress(input: AddressInput) {
  return {
    street_address: input.streetAddress?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    zip: input.zip?.trim() || null,
  };
}

export function formatServiceAddress(lead: Parameters<typeof getServiceAddressParts>[0]) {
  return formatAddressFromParts(getServiceAddressParts(lead));
}

export function formatBillingAddress(lead: Parameters<typeof getBillingAddressParts>[0]) {
  return formatAddressFromParts(getBillingAddressParts(lead));
}

/** Job-site address (service), with legacy field fallback */
export function formatFullAddress(lead: Parameters<typeof getServiceAddressParts>[0]) {
  return formatServiceAddress(lead);
}

export function mapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function formatCityState(lead: Parameters<typeof getServiceAddressParts>[0]) {
  const service = getServiceAddressParts(lead);
  if (!service.city && !service.state && !service.zip) return null;
  const line = [service.city, service.state].filter(Boolean).join(", ");
  return service.zip ? `${line} ${service.zip}`.trim() : line || null;
}