import { STAGE_LABELS } from "@/lib/leads/constants";
import type { ActivityWithActor } from "@/lib/leads/types";
import type { LeadStage } from "@/types/database";

const ACTION_LABELS: Record<ActivityWithActor["action"], string> = {
  created: "created this lead",
  stage_changed: "moved stage",
  status_changed: "changed status",
  reassigned: "reassigned owner",
  value_set: "set deal value",
  edited: "edited lead details",
};

function formatStage(value: string | null): string {
  if (!value) return "—";
  return STAGE_LABELS[value as LeadStage] ?? value;
}

function formatStatus(value: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

export function formatActivityDescription(activity: ActivityWithActor): string {
  const actor = activity.actor?.full_name ?? "Someone";

  switch (activity.action) {
    case "created":
      return `${actor} created this lead`;
    case "stage_changed":
      return `${actor} moved from ${formatStage(activity.from_value)} to ${formatStage(activity.to_value)}`;
    case "status_changed":
      return `${actor} changed status from ${formatStatus(activity.from_value)} to ${formatStatus(activity.to_value)}`;
    case "reassigned":
      if (activity.from_value === "unclaimed") {
        return `${actor} claimed this lead`;
      }
      return `${actor} reassigned this lead`;
    case "value_set":
      return activity.to_value
        ? `${actor} set value to ${activity.to_value}`
        : `${actor} updated deal value`;
    case "edited":
      return `${actor} edited lead details`;
    default:
      return `${actor} ${ACTION_LABELS[activity.action]}`;
  }
}