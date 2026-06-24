import { formatSourceLabel } from "@/lib/leads/sources";
import type { LeadStage } from "@/types/database";

export function getSourceDisplayLabel(source: string | null | undefined): string {
  return formatSourceLabel(source);
}

export const PIPELINE_STAGES: { key: LeadStage; label: string }[] = [
  { key: "lead_captured", label: "Lead Captured" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "negotiating", label: "Negotiating" },
  { key: "closed", label: "Closed" },
];

export const STAGE_LABELS: Record<LeadStage, string> = {
  lead_captured: "Lead Captured",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  closed: "Closed",
};

export function stageDroppableId(stage: LeadStage): string {
  return `stage:${stage}`;
}

export function parseStageDroppableId(id: string): LeadStage | null {
  if (!id.startsWith("stage:")) return null;
  return id.slice(6) as LeadStage;
}

export function leadDraggableId(leadId: string): string {
  return `lead:${leadId}`;
}

export function parseLeadDraggableId(id: string): string | null {
  if (!id.startsWith("lead:")) return null;
  return id.slice(5);
}