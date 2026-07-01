import type { LeadWithOwner } from "@/lib/leads/types";

export function getBatchAssignableLeads(
  leads: LeadWithOwner[]
): LeadWithOwner[] {
  return leads.filter((lead) => lead.status === "active");
}

export function getBatchAssignableIds(leads: LeadWithOwner[]): string[] {
  return getBatchAssignableLeads(leads).map((lead) => lead.id);
}