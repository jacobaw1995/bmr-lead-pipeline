import type { Lead } from "@/types/database";

export type MilestoneKey =
  | "inspection_scheduled"
  | "roof_scope_ordered"
  | "site_survey_complete"
  | "quote_presented";

export interface MilestoneDef {
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  icon: string;
  field: keyof Pick<
    Lead,
    | "inspection_scheduled_at"
    | "roof_scope_ordered_at"
    | "site_survey_complete_at"
    | "quote_presented_at"
  >;
}

export const MILESTONES: MilestoneDef[] = [
  {
    key: "inspection_scheduled",
    label: "Inspection Scheduled",
    shortLabel: "Inspect",
    icon: "📅",
    field: "inspection_scheduled_at",
  },
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
    shortLabel: "Survey",
    icon: "🏠",
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

export function getMilestoneProgress(lead: Lead): number {
  const done = MILESTONES.filter((m) => lead[m.field] != null).length;
  return Math.round((done / MILESTONES.length) * 100);
}

export function getMilestoneLabel(key: MilestoneKey): string {
  return MILESTONES.find((m) => m.key === key)?.label ?? key;
}