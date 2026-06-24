import type { Lead, AppointmentType, LeadAppointment } from "@/types/database";
import { getActiveAppointment } from "@/lib/leads/appointments";

export type MilestoneKey =
  | "roof_scope_ordered"
  | "site_survey_complete"
  | "quote_presented";

export type SchedulableKey = "inspection_scheduled" | "site_survey_scheduled";

export interface MilestoneDef {
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  icon: string;
  field: keyof Pick<
    Lead,
    "roof_scope_ordered_at" | "site_survey_complete_at" | "quote_presented_at"
  >;
}

export interface SchedulableDef {
  key: SchedulableKey;
  label: string;
  shortLabel: string;
  icon: string;
  appointmentType: AppointmentType;
}

export const SCHEDULABLE_STEPS: SchedulableDef[] = [
  {
    key: "inspection_scheduled",
    label: "Inspection Scheduled",
    shortLabel: "Inspect",
    icon: "📅",
    appointmentType: "inspection",
  },
  {
    key: "site_survey_scheduled",
    label: "Site Survey Scheduled",
    shortLabel: "Survey",
    icon: "🏠",
    appointmentType: "site_survey",
  },
];

export const TOGGLE_MILESTONES: MilestoneDef[] = [
  {
    key: "roof_scope_ordered",
    label: "Roof Scope Ordered",
    shortLabel: "Scope",
    icon: "📐",
    field: "roof_scope_ordered_at",
  },
  {
    key: "site_survey_complete",
    label: "Site Survey Done",
    shortLabel: "Done",
    icon: "✓",
    field: "site_survey_complete_at",
  },
  {
    key: "quote_presented",
    label: "Quote Presented",
    shortLabel: "Quote",
    icon: "💰",
    field: "quote_presented_at",
  },
];

export function isSchedulableDone(
  appointments: LeadAppointment[] | undefined,
  type: AppointmentType
): boolean {
  return getActiveAppointment(appointments, type) != null;
}

export function getMilestoneProgress(
  lead: Lead,
  appointments?: LeadAppointment[]
): number {
  const steps = [
    isSchedulableDone(appointments, "inspection"),
    lead.roof_scope_ordered_at != null,
    isSchedulableDone(appointments, "site_survey"),
    lead.site_survey_complete_at != null,
    lead.quote_presented_at != null ||
      lead.stage === "proposal_sent" ||
      lead.stage === "negotiating" ||
      lead.stage === "closed",
  ];
  const done = steps.filter(Boolean).length;
  return Math.round((done / steps.length) * 100);
}

export function getMilestoneLabel(key: MilestoneKey | SchedulableKey): string {
  const sched = SCHEDULABLE_STEPS.find((m) => m.key === key);
  if (sched) return sched.label;
  return TOGGLE_MILESTONES.find((m) => m.key === key)?.label ?? key;
}