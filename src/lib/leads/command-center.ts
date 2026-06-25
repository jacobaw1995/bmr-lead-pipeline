import { formatServiceAddress, mapsDirectionsUrl } from "@/lib/leads/address";
import {
  formatAppointmentDateTime,
  getSiteVisitAppointment,
} from "@/lib/leads/appointments";
import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/leads/format";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import type { Lead, LeadAppointment } from "@/types/database";

export type CommandStageKey =
  | "new_lead"
  | "site_visit"
  | "scope"
  | "quote"
  | "negotiating"
  | "closed";

export const COMMAND_STAGES: { key: CommandStageKey; label: string }[] = [
  { key: "new_lead", label: "New Lead" },
  { key: "site_visit", label: "Site Visit Scheduled" },
  { key: "scope", label: "Scope" },
  { key: "quote", label: "Quote" },
  { key: "negotiating", label: "Negotiating" },
  { key: "closed", label: "Closed" },
];

export interface VitalField {
  label: string;
  value: string | null;
  href?: string;
  emptyHint?: string;
}

export function isCommandStageComplete(
  key: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[]
): boolean {
  switch (key) {
    case "new_lead":
      return lead.stage !== "lead_captured";
    case "site_visit":
      return (
        lead.site_survey_complete_at != null ||
        getSiteVisitAppointment(appointments)?.state === "completed"
      );
    case "scope":
      return lead.roof_scope_ordered_at != null;
    case "quote":
      return (
        lead.quote_presented_at != null ||
        lead.stage === "proposal_sent" ||
        lead.stage === "negotiating" ||
        lead.stage === "closed"
      );
    case "negotiating":
      return lead.stage === "negotiating" || lead.stage === "closed";
    case "closed":
      return lead.status !== "active";
    default:
      return false;
  }
}

export function getCommandProgress(
  lead: Lead,
  appointments?: LeadAppointment[]
): number {
  const done = COMMAND_STAGES.filter((s) =>
    isCommandStageComplete(s.key, lead, appointments)
  ).length;
  return Math.round((done / COMMAND_STAGES.length) * 100);
}

export function deriveActiveCommandStage(
  lead: Lead,
  appointments?: LeadAppointment[]
): CommandStageKey {
  if (lead.status !== "active") return "closed";
  if (lead.stage === "negotiating") return "negotiating";
  if (lead.stage === "qualified") return "site_visit";
  if (
    lead.stage === "proposal_sent" ||
    lead.quote_presented_at ||
    lead.stage === "closed"
  ) {
    return "quote";
  }
  if (lead.roof_scope_ordered_at) return "scope";
  if (
    getSiteVisitAppointment(appointments) ||
    lead.site_survey_complete_at
  ) {
    return "site_visit";
  }
  return "new_lead";
}

export function getCommandStageLabel(key: CommandStageKey): string {
  return COMMAND_STAGES.find((s) => s.key === key)?.label ?? key;
}

export function getRecommendedAction(
  view: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[]
): string {
  const siteVisit = getSiteVisitAppointment(appointments);

  switch (view) {
    case "new_lead":
      if (!lead.owner_id) return "Claim this lead and qualify the opportunity.";
      if (lead.stage === "lead_captured") {
        return "Confirm contact info and move to Qualified when ready.";
      }
      return "Schedule the site visit once you've made first contact.";
    case "site_visit":
      if (!siteVisit) return "Schedule the site visit on the calendar.";
      if (siteVisit.state === "scheduled") {
        return `Visit set for ${formatAppointmentDateTime(siteVisit.appointment.scheduled_at)} — confirm the day before.`;
      }
      return "Order roof scope measurements after the visit.";
    case "scope":
      if (!lead.roof_scope_ordered_at) {
        return "Order scope and mark complete when measurements are in.";
      }
      return "Build the quote from scope data and present to the customer.";
    case "quote":
      if (!lead.value) return "Set the quote amount and walk them through it.";
      if (!lead.quote_presented_at) {
        return "Present the quote and mark Quote Presented when delivered.";
      }
      return "Follow up within 24 hours and move to Negotiating if they're deciding.";
    case "negotiating":
      return "Address objections, follow up on timeline, and close won or lost.";
    case "closed":
      if (lead.status === "closed_won") {
        return "Celebrate the win — hand off to production when ready.";
      }
      if (lead.status === "closed_lost") {
        return "Review the coaching note for lessons on the next lead.";
      }
      return "Mark the deal won or lost when negotiation finishes.";
    default:
      return "Take the next step on this lead.";
  }
}

export function getMarkCompleteLabel(view: CommandStageKey): string {
  switch (view) {
    case "new_lead":
      return "Mark Qualified";
    case "site_visit":
      return "Mark Visit Complete";
    case "scope":
      return "Mark Scope Ordered";
    case "quote":
      return "Mark Quote Presented";
    case "negotiating":
      return "Move to Negotiating";
    case "closed":
      return "Close Deal";
    default:
      return "Mark Stage Complete";
  }
}

export function canMarkStageComplete(
  view: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[],
  canEdit?: boolean
): boolean {
  if (!canEdit || lead.status !== "active") return false;
  if (isCommandStageComplete(view, lead, appointments)) return false;

  switch (view) {
    case "new_lead":
      return lead.stage === "lead_captured";
    case "site_visit":
      return getSiteVisitAppointment(appointments)?.state === "scheduled";
    case "scope":
      return !lead.roof_scope_ordered_at;
    case "quote":
      return !lead.quote_presented_at && lead.stage !== "proposal_sent";
    case "negotiating":
      return lead.stage === "proposal_sent";
    case "closed":
      return false;
    default:
      return false;
  }
}

function decisionMaker(lead: Lead): string | null {
  const person = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  if (person) return person;
  if (lead.company_name) return lead.company_name;
  return formatLeadDisplayName(lead);
}

export function getVitalFields(
  view: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[],
  latestNote?: string | null
): VitalField[] {
  const service = formatServiceAddress(lead);
  const siteVisit = getSiteVisitAppointment(appointments);

  switch (view) {
    case "new_lead":
      return [
        {
          label: "Contact",
          value: decisionMaker(lead),
          emptyHint: "Add name in prospect panel",
        },
        {
          label: "Cell phone",
          value: lead.cell_phone ?? lead.phone,
          emptyHint: "Add phone",
        },
        {
          label: "Customer type",
          value: lead.homeowner_or_contractor,
          emptyHint: "Homeowner or Contractor",
        },
        {
          label: "Source",
          value: getSourceDisplayLabel(lead.source),
        },
      ];
    case "site_visit":
      return [
        {
          label: "Service address",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
          emptyHint: "Add job site address",
        },
        {
          label: "Visit status",
          value: siteVisit
            ? siteVisit.state === "scheduled"
              ? formatAppointmentDateTime(siteVisit.appointment.scheduled_at)
              : `Completed · ${formatAppointmentDateTime(siteVisit.appointment.scheduled_at)}`
            : null,
          emptyHint: "Not scheduled yet",
        },
        {
          label: "Cell phone",
          value: lead.cell_phone ?? lead.phone,
        },
      ];
    case "scope":
      return [
        {
          label: "Service address",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
        },
        {
          label: "Existing roof type",
          value: lead.existing_roof_type,
          emptyHint: "Add existing roof type",
        },
        {
          label: "Scope status",
          value: lead.roof_scope_ordered_at ? "Scope ordered" : null,
          emptyHint: "Not ordered yet",
        },
      ];
    case "quote":
      return [
        {
          label: "Service address",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
        },
        {
          label: "Current roof type",
          value: lead.existing_roof_type,
          emptyHint: "Add existing roof type",
        },
        {
          label: "Desired roof type",
          value: lead.roof_type_requested,
          emptyHint: "Add requested roof type",
        },
        {
          label: "Main issue / problem",
          value: latestNote ?? null,
          emptyHint: "Log activity to capture the main issue",
        },
        {
          label: "Key decision maker",
          value: decisionMaker(lead),
        },
      ];
    case "negotiating":
      return [
        {
          label: "Quote amount",
          value: lead.value != null ? formatCurrency(lead.value) : null,
          emptyHint: "Set quote value",
        },
        {
          label: "Desired roof type",
          value: lead.roof_type_requested,
        },
        {
          label: "Pipeline stage",
          value: STAGE_LABELS[lead.stage],
        },
        {
          label: "Last note",
          value: latestNote ?? null,
          emptyHint: "Log objections or follow-ups",
        },
      ];
    case "closed":
      return [
        {
          label: "Outcome",
          value:
            lead.status === "closed_won"
              ? "Closed Won"
              : lead.status === "closed_lost"
                ? "Closed Lost"
                : "Still active",
        },
        {
          label: "Deal value",
          value: lead.value != null ? formatCurrency(lead.value) : null,
        },
        {
          label: "Lost reason",
          value: lead.lost_reason,
        },
      ];
    default:
      return [];
  }
}