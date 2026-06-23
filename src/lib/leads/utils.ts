import type { LeadWithOwner } from "@/lib/leads/types";
import type { LeadStage } from "@/types/database";

export function groupLeadsByStage(
  leads: LeadWithOwner[]
): Record<LeadStage, LeadWithOwner[]> {
  return {
    lead_captured: leads.filter((l) => l.stage === "lead_captured"),
    qualified: leads.filter((l) => l.stage === "qualified"),
    proposal_sent: leads.filter((l) => l.stage === "proposal_sent"),
    negotiating: leads.filter((l) => l.stage === "negotiating"),
    closed: leads.filter((l) => l.stage === "closed"),
  };
}