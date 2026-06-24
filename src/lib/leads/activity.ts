import { formatAppointmentDateTime } from "@/lib/leads/appointments";
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
      if (activity.from_value === "csv_import") {
        return `${actor} imported this lead from CSV`;
      }
      return `${actor} created this lead`;
    case "stage_changed":
      return `${actor} moved from ${formatStage(activity.from_value)} to ${formatStage(activity.to_value)}`;
    case "status_changed":
      return `${actor} changed status from ${formatStatus(activity.from_value)} to ${formatStatus(activity.to_value)}`;
    case "reassigned":
      if (activity.from_value === "unclaimed") {
        return `${actor} claimed this lead`;
      }
      if (activity.to_value === "unclaimed") {
        return `${actor} returned this lead to the pool`;
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
    case "edited": {
      const label = activity.from_value ?? "step";
      if (activity.from_value === "Contact details" && activity.to_value === "updated") {
        return `${actor} updated contact details`;
      }
      if (activity.to_value === "completed") {
        return `${actor} completed ${label}`;
      }
      if (activity.to_value === "cleared") {
        return `${actor} cleared ${label}`;
      }
      if (activity.to_value?.startsWith("scheduled:")) {
        const when = activity.to_value.slice("scheduled:".length);
        return `${actor} scheduled ${label} for ${formatAppointmentDateTime(when)}`;
      }
      if (activity.to_value?.startsWith("completed:")) {
        const when = activity.to_value.slice("completed:".length);
        return `${actor} completed ${label} (${formatAppointmentDateTime(when)})`;
      }
      if (activity.to_value?.startsWith("cancelled:")) {
        const when = activity.to_value.slice("cancelled:".length);
        return `${actor} cancelled ${label} (${formatAppointmentDateTime(when)})`;
      }
      return `${actor} edited lead details`;
    }
    default:
      return `${actor} ${ACTION_LABELS[activity.action]}`;
  }
}