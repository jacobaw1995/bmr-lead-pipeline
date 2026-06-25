import { STAGE_LABELS } from "@/lib/leads/constants";
import type { Lead, LeadStage } from "@/types/database";

export interface AddressFields {
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface LeadProfileInput {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  billing?: AddressFields;
  service?: AddressFields;
  cellPhone?: string;
  secondaryPhone?: string;
  email?: string;
  stage?: LeadStage;
  source?: string;
  sourcePicked?: string;
  customSource?: string;
  existingRoofType?: string;
  roofTypeRequested?: string;
  remodelOrNewConstruction?: string;
  homeownerOrContractor?: string;
  notes?: string;
}

export type LeadProfileFields = Pick<
  Lead,
  | "first_name"
  | "last_name"
  | "company_name"
  | "billing_street_address"
  | "billing_city"
  | "billing_state"
  | "billing_zip"
  | "service_street_address"
  | "service_city"
  | "service_state"
  | "service_zip"
  | "cell_phone"
  | "secondary_phone"
  | "email"
  | "existing_roof_type"
  | "roof_type_requested"
  | "remodel_or_new_construction"
  | "homeowner_or_contractor"
  | "source"
  | "stage"
>;

function trimOrNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeState(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase().slice(0, 2) : null;
}

export function normalizeAddressFields(input?: AddressFields) {
  return {
    street_address: trimOrNull(input?.streetAddress),
    city: trimOrNull(input?.city),
    state: normalizeState(input?.state),
    zip: trimOrNull(input?.zip),
  };
}

export function formatLeadDisplayName(
  lead: Partial<Pick<Lead, "name" | "first_name" | "last_name" | "company_name">>
): string {
  const person = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (person && lead.company_name) {
    return `${person} (${lead.company_name})`;
  }
  if (person) return person;
  if (lead.company_name) return lead.company_name;
  return lead.name?.trim() || "Unnamed lead";
}

export function formatAddressFromParts(parts: {
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  legacy_address?: string | null;
}): string | null {
  const lines: string[] = [];
  if (parts.street_address) lines.push(parts.street_address);
  else if (parts.legacy_address) lines.push(parts.legacy_address);

  const cityStateZip = [
    parts.city,
    parts.state && parts.zip
      ? `${parts.state} ${parts.zip}`
      : parts.state || parts.zip,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityStateZip) lines.push(cityStateZip);
  return lines.length > 0 ? lines.join(", ") : null;
}

export type ServiceAddressLead = Partial<
  Pick<
    Lead,
    | "service_street_address"
    | "service_city"
    | "service_state"
    | "service_zip"
    | "street_address"
    | "city"
    | "state"
    | "zip"
    | "address"
  >
>;

export function getServiceAddressParts(lead: ServiceAddressLead) {
  return {
    street_address: lead.service_street_address ?? lead.street_address,
    city: lead.service_city ?? lead.city,
    state: lead.service_state ?? lead.state,
    zip: lead.service_zip ?? lead.zip,
    legacy_address: lead.address,
  };
}

export function getBillingAddressParts(
  lead: Partial<
    Pick<
      Lead,
      "billing_street_address" | "billing_city" | "billing_state" | "billing_zip"
    >
  >
) {
  return {
    street_address: lead.billing_street_address,
    city: lead.billing_city,
    state: lead.billing_state,
    zip: lead.billing_zip,
    legacy_address: null,
  };
}

export function getPrimaryPhone(
  lead: Partial<Pick<Lead, "cell_phone" | "phone">>
): string | null {
  return lead.cell_phone ?? lead.phone ?? null;
}

export function validateLeadIdentity(input: LeadProfileInput): string | null {
  const hasPerson =
    trimOrNull(input.firstName) || trimOrNull(input.lastName);
  const hasCompany = trimOrNull(input.companyName);
  if (!hasPerson && !hasCompany) {
    return "Enter a first or last name, or a company name.";
  }
  return null;
}

const STAGE_ALIASES: Record<string, LeadStage> = {
  lead_captured: "lead_captured",
  "lead captured": "lead_captured",
  captured: "lead_captured",
  new: "lead_captured",
  qualified: "qualified",
  qualify: "qualified",
  proposal_sent: "proposal_sent",
  "proposal sent": "proposal_sent",
  proposal: "proposal_sent",
  negotiating: "negotiating",
  negotiate: "negotiating",
  closed: "closed",
  won: "closed",
};

export function parseImportStage(raw?: string): LeadStage | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (STAGE_ALIASES[key]) return STAGE_ALIASES[key];
  if (key in STAGE_LABELS) return key as LeadStage;
  return null;
}

export function leadToProfileInput(
  lead: Lead,
  sourcePicker?: { picked: string; customSource: string }
): LeadProfileInput {
  return {
    firstName: lead.first_name ?? "",
    lastName: lead.last_name ?? "",
    companyName: lead.company_name ?? "",
    billing: {
      streetAddress: lead.billing_street_address ?? "",
      city: lead.billing_city ?? "",
      state: lead.billing_state ?? "",
      zip: lead.billing_zip ?? "",
    },
    service: {
      streetAddress:
        lead.service_street_address ?? lead.street_address ?? "",
      city: lead.service_city ?? lead.city ?? "",
      state: lead.service_state ?? lead.state ?? "",
      zip: lead.service_zip ?? lead.zip ?? "",
    },
    cellPhone: lead.cell_phone ?? lead.phone ?? "",
    secondaryPhone: lead.secondary_phone ?? "",
    email: lead.email ?? "",
    stage: lead.stage,
    source: lead.source,
    sourcePicked: sourcePicker?.picked,
    customSource: sourcePicker?.customSource,
    existingRoofType: lead.existing_roof_type ?? "",
    roofTypeRequested: lead.roof_type_requested ?? "",
    remodelOrNewConstruction: lead.remodel_or_new_construction ?? "",
    homeownerOrContractor: lead.homeowner_or_contractor ?? "",
  };
}

export function buildLeadProfileRecord(
  input: LeadProfileInput,
  source: string
): Record<string, string | null> {
  const billing = normalizeAddressFields(input.billing);
  const service = normalizeAddressFields(input.service);
  const displayName = formatLeadDisplayName({
    name: "",
    first_name: trimOrNull(input.firstName),
    last_name: trimOrNull(input.lastName),
    company_name: trimOrNull(input.companyName),
  });
  const serviceFormatted = formatAddressFromParts(service);
  const cellPhone = trimOrNull(input.cellPhone);

  return {
    name: displayName,
    first_name: trimOrNull(input.firstName),
    last_name: trimOrNull(input.lastName),
    company_name: trimOrNull(input.companyName),
    billing_street_address: billing.street_address,
    billing_city: billing.city,
    billing_state: billing.state,
    billing_zip: billing.zip,
    service_street_address: service.street_address,
    service_city: service.city,
    service_state: service.state,
    service_zip: service.zip,
    cell_phone: cellPhone,
    secondary_phone: trimOrNull(input.secondaryPhone),
    phone: cellPhone,
    email: trimOrNull(input.email),
    street_address: service.street_address,
    city: service.city,
    state: service.state,
    zip: service.zip,
    address: serviceFormatted,
    source,
    existing_roof_type: trimOrNull(input.existingRoofType),
    roof_type_requested: trimOrNull(input.roofTypeRequested),
    remodel_or_new_construction: trimOrNull(input.remodelOrNewConstruction),
    homeowner_or_contractor: trimOrNull(input.homeownerOrContractor),
  };
}