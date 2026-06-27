import { formatServiceAddress } from "@/lib/leads/address";
import { getSiteVisitAppointment } from "@/lib/leads/appointments";
import { formatRoofTypes, hasRoofTypeValue } from "@/lib/leads/roof-types";
import type { Lead, LeadAppointment } from "@/types/database";
import type { NoteWithAuthor } from "@/lib/leads/types";

export interface IntakeChecklistData {
  main_issue?: string;
  /** Always-visible team notes — editable on every pipeline stage */
  general_notes?: string;
  site_visit?: Record<string, string | number | boolean>;
}

export interface ChecklistItemStatus {
  key: string;
  label: string;
  complete: boolean;
  hint?: string;
}

export const INTAKE_CALL_ITEMS: { key: string; label: string; hint?: string }[] =
  [
    { key: "contact_name", label: "Contact name (first & last)", hint: "Decision maker" },
    { key: "cell_phone", label: "Cell phone" },
    { key: "email", label: "Email address", hint: "Best email for quote" },
    { key: "service_address", label: "Service address (job site)" },
    { key: "customer_type", label: "Homeowner or contractor" },
    { key: "existing_roof", label: "Existing roof type(s)", hint: "Include all sections — shingle + rubber, etc." },
    { key: "requested_roof", label: "Requested roof type(s)" },
    { key: "main_issue", label: "Main issue / problem" },
    { key: "project_type", label: "Remodel or new construction" },
    { key: "site_visit_scheduled", label: "Site visit scheduled on the call" },
  ];

export const SITE_VISIT_SCOPE_ITEMS: {
  key: string;
  label: string;
  inputType: "number" | "text" | "boolean";
  unit?: string;
  hint?: string;
}[] = [
  { key: "roof_sqft", label: "Roof area", inputType: "number", unit: "sq ft" },
  { key: "facets", label: "Roof facets", inputType: "number" },
  { key: "pitch_notes", label: "Pitch / slope notes", inputType: "text", hint: "e.g. 6/12 main, 4/12 porch" },
  { key: "gutters_lf", label: "Gutters", inputType: "number", unit: "linear ft" },
  { key: "fascia_lf", label: "Fascia", inputType: "number", unit: "linear ft" },
  { key: "soffit_lf", label: "Soffit", inputType: "number", unit: "linear ft" },
  { key: "pipe_boots", label: "Pipe boots", inputType: "number" },
  { key: "roof_vents", label: "Roof vents", inputType: "number" },
  { key: "osb_sheets", label: "OSB replacement", inputType: "number", unit: "sheets" },
  { key: "roof_color", label: "Roof color", inputType: "text" },
  { key: "roof_style", label: "Roof profile / style", inputType: "text", hint: "Standing seam, rib, shingle line…" },
  { key: "gutter_color", label: "Gutter color", inputType: "text" },
  { key: "ice_water_shield", label: "Ice & water shield needed", inputType: "boolean" },
  { key: "drip_edge", label: "Drip edge", inputType: "boolean" },
  { key: "scope_notes", label: "Scope notes / extras", inputType: "text", hint: "Chimney, skylights, crickets…" },
];

export function parseIntakeChecklist(
  raw: unknown
): IntakeChecklistData {
  if (!raw || typeof raw !== "object") return {};
  const data = raw as IntakeChecklistData;
  return {
    main_issue: typeof data.main_issue === "string" ? data.main_issue : undefined,
    general_notes:
      typeof data.general_notes === "string" ? data.general_notes : undefined,
    site_visit:
      data.site_visit && typeof data.site_visit === "object"
        ? data.site_visit
        : undefined,
  };
}

function hasContactName(lead: Lead): boolean {
  return Boolean(
    (lead.first_name?.trim() && lead.last_name?.trim()) ||
      lead.name?.trim()
  );
}

function hasValue(
  siteVisit: Record<string, string | number | boolean> | undefined,
  key: string,
  inputType: "number" | "text" | "boolean"
): boolean {
  const v = siteVisit?.[key];
  if (inputType === "boolean") return v === true || v === false;
  if (inputType === "number") return typeof v === "number" && v >= 0;
  return typeof v === "string" && v.trim().length > 0;
}

export function getIntakeItemComplete(
  key: string,
  lead: Lead,
  checklist: IntakeChecklistData,
  appointments?: LeadAppointment[],
  notes: NoteWithAuthor[] = []
): boolean {
  const siteVisit = getSiteVisitAppointment(appointments);

  switch (key) {
    case "contact_name":
      return hasContactName(lead);
    case "cell_phone":
      return Boolean(lead.cell_phone?.trim() || lead.phone?.trim());
    case "email":
      return Boolean(lead.email?.trim());
    case "service_address":
      return Boolean(formatServiceAddress(lead));
    case "customer_type":
      return Boolean(lead.homeowner_or_contractor?.trim());
    case "existing_roof":
      return hasRoofTypeValue(lead.existing_roof_type);
    case "requested_roof":
      return hasRoofTypeValue(lead.roof_type_requested);
    case "main_issue":
      return Boolean(getMainIssue(checklist, notes));
    case "project_type":
      return Boolean(lead.remodel_or_new_construction?.trim());
    case "site_visit_scheduled":
      return siteVisit?.state === "scheduled" || siteVisit?.state === "completed";
    default:
      return false;
  }
}

export function getIntakeChecklistStatus(
  lead: Lead,
  checklist: IntakeChecklistData,
  appointments?: LeadAppointment[],
  notes: NoteWithAuthor[] = []
): ChecklistItemStatus[] {
  return INTAKE_CALL_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    hint: item.hint,
    complete: getIntakeItemComplete(
      item.key,
      lead,
      checklist,
      appointments,
      notes
    ),
  }));
}

export function getIntakeProgress(
  lead: Lead,
  checklist: IntakeChecklistData,
  appointments?: LeadAppointment[],
  notes: NoteWithAuthor[] = []
): { done: number; total: number; percent: number } {
  const items = getIntakeChecklistStatus(
    lead,
    checklist,
    appointments,
    notes
  );
  const done = items.filter((i) => i.complete).length;
  const total = items.length;
  return {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function isIntakeChecklistComplete(
  lead: Lead,
  checklist: IntakeChecklistData,
  appointments?: LeadAppointment[],
  notes: NoteWithAuthor[] = []
): boolean {
  const { done, total } = getIntakeProgress(
    lead,
    checklist,
    appointments,
    notes
  );
  return done === total;
}

export function getSiteVisitScopeStatus(
  checklist: IntakeChecklistData
): ChecklistItemStatus[] {
  const site = checklist.site_visit ?? {};
  return SITE_VISIT_SCOPE_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    hint: item.hint,
    complete: hasValue(site, item.key, item.inputType),
  }));
}

export function getSiteVisitScopeProgress(checklist: IntakeChecklistData): {
  done: number;
  total: number;
  percent: number;
} {
  const items = getSiteVisitScopeStatus(checklist);
  const done = items.filter((i) => i.complete).length;
  const total = items.length;
  return {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function isSiteVisitScopeComplete(checklist: IntakeChecklistData): boolean {
  const { done, total } = getSiteVisitScopeProgress(checklist);
  return done === total;
}

export function getMainIssue(
  checklist: IntakeChecklistData,
  notes: NoteWithAuthor[]
): string | null {
  if (checklist.main_issue?.trim()) return checklist.main_issue.trim();
  return notes.at(-1)?.content?.trim() ?? null;
}

/** Human-readable scope summary from gathered site-visit data. */
export function buildScopeSummary(checklist: IntakeChecklistData): string | null {
  const s = checklist.site_visit;
  if (!s) return null;

  const parts: string[] = [];
  if (typeof s.roof_sqft === "number") parts.push(`${s.roof_sqft} sq ft roof`);
  if (typeof s.facets === "number") parts.push(`${s.facets} facets`);
  if (typeof s.gutters_lf === "number") parts.push(`${s.gutters_lf} LF gutters`);
  if (typeof s.fascia_lf === "number") parts.push(`${s.fascia_lf} LF fascia`);
  if (typeof s.soffit_lf === "number") parts.push(`${s.soffit_lf} LF soffit`);
  if (typeof s.osb_sheets === "number" && s.osb_sheets > 0) {
    parts.push(`${s.osb_sheets} OSB sheets`);
  }
  if (typeof s.pipe_boots === "number") parts.push(`${s.pipe_boots} pipe boots`);
  if (typeof s.roof_vents === "number") parts.push(`${s.roof_vents} vents`);
  if (typeof s.roof_color === "string" && s.roof_color.trim()) {
    parts.push(`Color: ${s.roof_color.trim()}`);
  }
  if (typeof s.roof_style === "string" && s.roof_style.trim()) {
    parts.push(s.roof_style.trim());
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatExistingRoofDisplay(lead: Lead): string | null {
  return formatRoofTypes(lead.existing_roof_type);
}

export function formatRequestedRoofDisplay(lead: Lead): string | null {
  return formatRoofTypes(lead.roof_type_requested);
}