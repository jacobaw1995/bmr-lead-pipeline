import { formatServiceAddress, mapsDirectionsUrl } from "@/lib/leads/address";
import {
  formatAppointmentDateTime,
  getSiteVisitAppointment,
} from "@/lib/leads/appointments";
import {
  getIntakeProgress,
  getMainIssue,
  isIntakeChecklistComplete,
  parseIntakeChecklist,
  formatExistingRoofDisplay,
  formatRequestedRoofDisplay,
} from "@/lib/leads/intake-checklist";
import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/leads/format";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import { getScopeStatusLabel } from "@/lib/leads/scope";
import type { Lead, LeadAppointment } from "@/types/database";
import type { NoteWithAuthor } from "@/lib/leads/types";
export type LeadFieldPatch = Partial<{
  firstName: string;
  lastName: string;
  cellPhone: string;
  secondaryPhone: string;
  email: string;
  homeownerOrContractor: string;
  remodelOrNewConstruction: string;
  existingRoofType: string | null;
  roofTypeRequested: string | null;
  serviceStreet: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;
}>;

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

export type VitalFieldType =
  | "text"
  | "phone"
  | "email"
  | "textarea"
  | "select"
  | "roof_types"
  | "address"
  | "readonly";

export type VitalPatchKey = keyof LeadFieldPatch | "mainIssue";

export interface VitalFieldDef {
  key: string;
  label: string;
  type: VitalFieldType;
  value: string | null;
  rawValue?: string | null;
  href?: string;
  emptyHint?: string;
  patchKey?: VitalPatchKey;
  options?: string[];
}

export function isCommandStageComplete(
  key: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[]
): boolean {
  const checklist = parseIntakeChecklist(lead.intake_checklist);

  switch (key) {
    case "new_lead":
      return (
        lead.stage !== "lead_captured" ||
        isIntakeChecklistComplete(lead, checklist, appointments)
      );
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
  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const intake = getIntakeProgress(lead, checklist, appointments);

  switch (view) {
    case "new_lead":
      if (!lead.owner_id) {
        return "Claim this lead, then call the prospect to start the intake checklist.";
      }
      if (intake.percent < 100) {
        return `Initiate contact and work through the intake checklist (${intake.done}/${intake.total}). Schedule the site visit on that call.`;
      }
      if (!siteVisit) {
        return "Intake complete — schedule the site visit if you haven't already.";
      }
      return "Intake and visit are set. Mark qualified when ready to move forward.";
    case "site_visit":
      if (!siteVisit) {
        return "Schedule the site visit once intake data is gathered.";
      }
      if (siteVisit.state === "scheduled") {
        return `Visit set for ${formatAppointmentDateTime(siteVisit.appointment.scheduled_at)} — confirm the day before and capture scope data on site.`;
      }
      return "Fill in the site visit scope checklist — the system builds scope automatically when complete.";
    case "scope":
      if (!lead.roof_scope_ordered_at) {
        return "Complete the site visit scope checklist. Scope builds automatically when all data points are in.";
      }
      return "Scope is built — review and move to quote / proposal.";
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
      return "Scope Auto-Builds";
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

  const checklist = parseIntakeChecklist(lead.intake_checklist);

  switch (view) {
    case "new_lead":
      return (
        lead.stage === "lead_captured" &&
        isIntakeChecklistComplete(lead, checklist, appointments)
      );
    case "site_visit":
      return getSiteVisitAppointment(appointments)?.state === "scheduled";
    case "scope":
      return false;
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

export function getVitalFieldDefs(
  view: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[],
  checklist = parseIntakeChecklist(lead.intake_checklist),
  notes: NoteWithAuthor[] = []
): VitalFieldDef[] {
  const service = formatServiceAddress(lead);
  const siteVisit = getSiteVisitAppointment(appointments);
  const mainIssue = getMainIssue(checklist, notes);

  switch (view) {
    case "new_lead":
      return [
        {
          key: "first_name",
          label: "First name",
          type: "text",
          value: lead.first_name,
          emptyHint: "Gather on intake call",
          patchKey: "firstName",
        },
        {
          key: "last_name",
          label: "Last name",
          type: "text",
          value: lead.last_name,
          emptyHint: "Gather on intake call",
          patchKey: "lastName",
        },
        {
          key: "cell_phone",
          label: "Cell phone",
          type: "phone",
          value: lead.cell_phone ?? lead.phone,
          emptyHint: "Add phone",
          patchKey: "cellPhone",
        },
        {
          key: "email",
          label: "Email",
          type: "email",
          value: lead.email,
          emptyHint: "Add email",
          patchKey: "email",
        },
        {
          key: "customer_type",
          label: "Customer type",
          type: "select",
          value: lead.homeowner_or_contractor,
          options: ["Homeowner", "Contractor"],
          emptyHint: "Select type",
          patchKey: "homeownerOrContractor",
        },
        {
          key: "main_issue",
          label: "Main issue / problem",
          type: "textarea",
          value: mainIssue,
          emptyHint: "What's driving this project?",
          patchKey: "mainIssue",
        },
        {
          key: "existing_roof",
          label: "Existing roof type(s)",
          type: "roof_types",
          value: formatExistingRoofDisplay(lead),
          rawValue: lead.existing_roof_type,
          emptyHint: "Select all sections",
          patchKey: "existingRoofType",
        },
        {
          key: "requested_roof",
          label: "Requested roof type(s)",
          type: "roof_types",
          value: formatRequestedRoofDisplay(lead),
          rawValue: lead.roof_type_requested,
          emptyHint: "What they want installed",
          patchKey: "roofTypeRequested",
        },
        {
          key: "project_type",
          label: "Remodel / new",
          type: "select",
          value: lead.remodel_or_new_construction,
          options: ["Remodel", "New Construction"],
          emptyHint: "Project type",
          patchKey: "remodelOrNewConstruction",
        },
        {
          key: "service_address",
          label: "Service address",
          type: "address",
          value: service,
          rawValue: lead.service_street_address ?? lead.street_address,
          href: service ? mapsDirectionsUrl(service) : undefined,
          emptyHint: "Job site street",
          patchKey: "serviceStreet",
        },
        {
          key: "source",
          label: "Source",
          type: "readonly",
          value: getSourceDisplayLabel(lead.source),
        },
      ];
    case "site_visit":
      return [
        {
          key: "service_address",
          label: "Service address",
          type: "address",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
          emptyHint: "Add job site address",
          patchKey: "serviceStreet",
        },
        {
          key: "visit_status",
          label: "Visit status",
          type: "readonly",
          value: siteVisit
            ? siteVisit.state === "scheduled"
              ? formatAppointmentDateTime(siteVisit.appointment.scheduled_at)
              : `Completed · ${formatAppointmentDateTime(siteVisit.appointment.scheduled_at)}`
            : null,
          emptyHint: "Not scheduled yet",
        },
        {
          key: "cell_phone",
          label: "Cell phone",
          type: "phone",
          value: lead.cell_phone ?? lead.phone,
          patchKey: "cellPhone",
        },
        {
          key: "existing_roof",
          label: "Existing roof type(s)",
          type: "roof_types",
          value: formatExistingRoofDisplay(lead),
          rawValue: lead.existing_roof_type,
          patchKey: "existingRoofType",
        },
        {
          key: "requested_roof",
          label: "Requested roof type(s)",
          type: "roof_types",
          value: formatRequestedRoofDisplay(lead),
          rawValue: lead.roof_type_requested,
          patchKey: "roofTypeRequested",
        },
      ];
    case "scope":
      return [
        {
          key: "service_address",
          label: "Service address",
          type: "readonly",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
        },
        {
          key: "existing_roof",
          label: "Existing roof type(s)",
          type: "roof_types",
          value: formatExistingRoofDisplay(lead),
          rawValue: lead.existing_roof_type,
          patchKey: "existingRoofType",
        },
        {
          key: "requested_roof",
          label: "Requested roof type(s)",
          type: "roof_types",
          value: formatRequestedRoofDisplay(lead),
          rawValue: lead.roof_type_requested,
          patchKey: "roofTypeRequested",
        },
        {
          key: "scope_status",
          label: "Scope status",
          type: "readonly",
          value: getScopeStatusLabel(lead, appointments),
          emptyHint: "Gather site visit data to build scope",
        },
      ];
    case "quote":
      return [
        {
          key: "service_address",
          label: "Service address",
          type: "readonly",
          value: service,
          href: service ? mapsDirectionsUrl(service) : undefined,
        },
        {
          key: "existing_roof",
          label: "Current roof type(s)",
          type: "roof_types",
          value: formatExistingRoofDisplay(lead),
          rawValue: lead.existing_roof_type,
          patchKey: "existingRoofType",
        },
        {
          key: "requested_roof",
          label: "Desired roof type(s)",
          type: "roof_types",
          value: formatRequestedRoofDisplay(lead),
          rawValue: lead.roof_type_requested,
          patchKey: "roofTypeRequested",
        },
        {
          key: "main_issue",
          label: "Main issue / problem",
          type: "textarea",
          value: mainIssue,
          emptyHint: "Capture the main issue",
          patchKey: "mainIssue",
        },
        {
          key: "decision_maker",
          label: "Key decision maker",
          type: "readonly",
          value: decisionMaker(lead),
          emptyHint: "Update name in vital fields above",
        },
      ];
    case "negotiating":
      return [
        {
          key: "quote_amount",
          label: "Quote amount",
          type: "readonly",
          value: lead.value != null ? formatCurrency(lead.value) : null,
          emptyHint: "Set quote value",
        },
        {
          key: "requested_roof",
          label: "Desired roof type(s)",
          type: "roof_types",
          value: formatRequestedRoofDisplay(lead),
          rawValue: lead.roof_type_requested,
          patchKey: "roofTypeRequested",
        },
        {
          key: "pipeline_stage",
          label: "Pipeline stage",
          type: "readonly",
          value: STAGE_LABELS[lead.stage],
        },
        {
          key: "last_note",
          label: "Last note",
          type: "textarea",
          value: mainIssue,
          emptyHint: "Log objections or follow-ups",
          patchKey: "mainIssue",
        },
      ];
    case "closed":
      return [
        {
          key: "outcome",
          label: "Outcome",
          type: "readonly",
          value:
            lead.status === "closed_won"
              ? "Closed Won"
              : lead.status === "closed_lost"
                ? "Closed Lost"
                : "Still active",
        },
        {
          key: "deal_value",
          label: "Deal value",
          type: "readonly",
          value: lead.value != null ? formatCurrency(lead.value) : null,
        },
        {
          key: "lost_reason",
          label: "Lost reason",
          type: "readonly",
          value: lead.lost_reason,
        },
      ];
    default:
      return [];
  }
}

/** @deprecated Use getVitalFieldDefs — kept for compatibility */
export function getVitalFields(
  view: CommandStageKey,
  lead: Lead,
  appointments?: LeadAppointment[],
  latestNote?: string | null
): { label: string; value: string | null; href?: string; emptyHint?: string }[] {
  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const notes = latestNote
    ? [{ content: latestNote } as NoteWithAuthor]
    : [];
  return getVitalFieldDefs(view, lead, appointments, checklist, notes).map(
    (f) => ({
      label: f.label,
      value: f.value,
      href: f.href,
      emptyHint: f.emptyHint,
    })
  );
}