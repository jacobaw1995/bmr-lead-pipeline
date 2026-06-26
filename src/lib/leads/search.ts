import { formatLeadSourceDisplay } from "@/lib/leads/sources";
import { formatRoofTypes } from "@/lib/leads/roof-types";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { LeadStage } from "@/types/database";

export type LeadOwnershipFilter = "all" | "mine" | "unclaimed" | string;

export interface LeadSearchFilters {
  query: string;
  stage: LeadStage | "all";
  ownership: LeadOwnershipFilter;
  source: string;
  city: string;
}

export const DEFAULT_LEAD_SEARCH_FILTERS: LeadSearchFilters = {
  query: "",
  stage: "all",
  ownership: "all",
  source: "all",
  city: "all",
};

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function leadCity(lead: LeadWithOwner): string | null {
  const city =
    lead.service_city?.trim() ||
    lead.city?.trim() ||
    lead.billing_city?.trim() ||
    null;
  return city;
}

export function buildLeadSearchText(lead: LeadWithOwner): string {
  const parts = [
    lead.name,
    lead.first_name,
    lead.last_name,
    lead.company_name,
    lead.phone,
    lead.cell_phone,
    lead.secondary_phone,
    lead.email,
    lead.address,
    lead.street_address,
    lead.city,
    lead.state,
    lead.zip,
    lead.billing_street_address,
    lead.billing_city,
    lead.billing_state,
    lead.billing_zip,
    lead.service_street_address,
    lead.service_city,
    lead.service_state,
    lead.service_zip,
    formatLeadSourceDisplay(lead),
    lead.referral_name,
    lead.owner?.full_name,
    formatRoofTypes(lead.existing_roof_type),
    formatRoofTypes(lead.roof_type_requested),
    lead.existing_roof_type,
    lead.roof_type_requested,
  ];

  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

export function hasActiveFilters(filters: LeadSearchFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.stage !== "all" ||
    filters.ownership !== "all" ||
    filters.source !== "all" ||
    filters.city !== "all"
  );
}

export function filterLeads(
  leads: LeadWithOwner[],
  filters: LeadSearchFilters,
  currentUserId: string
): LeadWithOwner[] {
  const query = normalizeSearchText(filters.query);

  return leads.filter((lead) => {
    if (filters.stage !== "all" && lead.stage !== filters.stage) {
      return false;
    }

    if (filters.ownership === "mine") {
      if (lead.owner_id !== currentUserId) return false;
    } else if (filters.ownership === "unclaimed") {
      if (lead.owner_id) return false;
    } else if (filters.ownership !== "all") {
      if (lead.owner_id !== filters.ownership) return false;
    }

    if (filters.source !== "all") {
      const source = lead.source?.trim() ?? "";
      if (normalizeSearchText(source) !== normalizeSearchText(filters.source)) {
        return false;
      }
    }

    if (filters.city !== "all") {
      const city = leadCity(lead);
      if (!city || normalizeSearchText(city) !== normalizeSearchText(filters.city)) {
        return false;
      }
    }

    if (query) {
      const haystack = buildLeadSearchText(lead);
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function extractUniqueSources(leads: LeadWithOwner[]): string[] {
  const sources = new Set<string>();
  for (const lead of leads) {
    const source = lead.source?.trim();
    if (source) sources.add(source);
  }
  return Array.from(sources).sort((a, b) => a.localeCompare(b));
}

export function extractUniqueCities(leads: LeadWithOwner[]): string[] {
  const cities = new Set<string>();
  for (const lead of leads) {
    const city = leadCity(lead);
    if (city) cities.add(city);
  }
  return Array.from(cities).sort((a, b) => a.localeCompare(b));
}

export function extractUniqueOwners(
  leads: LeadWithOwner[]
): { id: string; name: string }[] {
  const owners = new Map<string, string>();
  for (const lead of leads) {
    if (lead.owner_id && lead.owner?.full_name) {
      owners.set(lead.owner_id, lead.owner.full_name);
    }
  }
  return Array.from(owners.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}