import { STAGE_LABELS } from "@/lib/leads/constants";

function formatActivityCurrency(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}
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
    case "value_set": {
      const amount = activity.to_value
        ? formatActivityCurrency(activity.to_value)
        : null;
      const prev = activity.from_value
        ? formatActivityCurrency(activity.from_value)
        : null;
      if (amount && prev) return `${actor} updated quote from ${prev} to ${amount}`;
      if (amount) return `${actor} set quote to ${amount}`;
      return `${actor} cleared the quote value`;
    }
    case "edited":
      if (activity.to_value === "completed" || activity.to_value === "cleared") {
        const label = activity.from_value ?? "milestone";
        return activity.to_value === "completed"
          ? `${actor} completed ${label}`
          : `${actor} cleared ${label}`;
      }
      return `${actor} edited lead details`;
    default:
      return `${actor} ${ACTION_LABELS[activity.action]}`;
  }
}