import { getSiteVisitAppointment } from "@/lib/leads/appointments";
import {
  buildScopeSummary,
  getSiteVisitScopeProgress,
  isSiteVisitScopeComplete,
  parseIntakeChecklist,
  type IntakeChecklistData,
} from "@/lib/leads/intake-checklist";
import type { Lead, LeadAppointment } from "@/types/database";

export type ScopeBuildStatus =
  | "not_started"
  | "gathering"
  | "ready_to_build"
  | "built";

export function getScopeBuildStatus(
  lead: Lead,
  appointments?: LeadAppointment[]
): ScopeBuildStatus {
  if (lead.roof_scope_ordered_at) return "built";

  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const visit = getSiteVisitAppointment(appointments);
  const visitDone =
    lead.site_survey_complete_at != null || visit?.state === "completed";

  if (!visitDone) {
    const progress = getScopeGatheringPercent(checklist);
    return progress > 0 ? "gathering" : "not_started";
  }

  if (isSiteVisitScopeComplete(checklist)) return "ready_to_build";
  return "gathering";
}

export function getScopeGatheringPercent(checklist: IntakeChecklistData): number {
  return getSiteVisitScopeProgress(checklist).percent;
}

export function getScopeStatusLabel(
  lead: Lead,
  appointments?: LeadAppointment[]
): string {
  const status = getScopeBuildStatus(lead, appointments);
  const checklist = parseIntakeChecklist(lead.intake_checklist);

  switch (status) {
    case "built": {
      const summary = buildScopeSummary(checklist);
      return summary ? `Scope built — ${summary}` : "Scope built";
    }
    case "ready_to_build":
      return "All measurements gathered — scope ready to generate";
    case "gathering": {
      const { done, total } = getSiteVisitScopeProgress(checklist);
      return `Gathering data (${done}/${total})`;
    }
    default:
      return "Complete site visit checklist to build scope";
  }
}

export function shouldAutoBuildScope(
  lead: Lead,
  appointments?: LeadAppointment[]
): boolean {
  if (lead.roof_scope_ordered_at) return false;

  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const visit = getSiteVisitAppointment(appointments);
  const visitDone =
    lead.site_survey_complete_at != null || visit?.state === "completed";

  return visitDone && isSiteVisitScopeComplete(checklist);
}