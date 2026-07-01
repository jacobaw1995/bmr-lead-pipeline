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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOwnerId(value: string | null): value is string {
  return Boolean(value && value !== "unclaimed" && UUID_RE.test(value));
}

function ownerLabel(
  ownerId: string | null,
  ownerNames?: Record<string, string>
): string {
  if (!ownerId || ownerId === "unclaimed") return "the pool";
  return ownerNames?.[ownerId] ?? "another rep";
}

function parseAppointmentActivityValue(
  value: string,
  prefix: string
): { when: string; detail: string | null } {
  const rest = value.slice(prefix.length);
  const splitAt = rest.indexOf("::");
  if (splitAt === -1) {
    return { when: rest, detail: null };
  }
  return {
    when: rest.slice(0, splitAt),
    detail: rest.slice(splitAt + 2).trim() || null,
  };
}

export function formatActivityDescription(
  activity: ActivityWithActor,
  ownerNames?: Record<string, string>
): string {
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
    case "reassigned": {
      const fromId = activity.from_value;
      const toId = activity.to_value;
      const actorId = activity.actor_id;

      if (fromId === "unclaimed" && isOwnerId(toId)) {
        if (toId === actorId) {
          return `${actor} claimed this lead`;
        }
        return `${actor} assigned this lead to ${ownerLabel(toId, ownerNames)}`;
      }
      if (toId === "unclaimed") {
        return `${actor} returned this lead to the pool`;
      }
      if (isOwnerId(fromId) && isOwnerId(toId)) {
        return `${actor} reassigned this lead from ${ownerLabel(fromId, ownerNames)} to ${ownerLabel(toId, ownerNames)}`;
      }
      return `${actor} reassigned this lead`;
    }
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
      if (
        (activity.from_value === "Contact details" ||
          activity.from_value === "Lead profile") &&
        activity.to_value === "updated"
      ) {
        return `${actor} updated lead details`;
      }
      if (activity.to_value === "completed") {
        return `${actor} completed ${label}`;
      }
      if (activity.to_value === "cleared") {
        return `${actor} cleared ${label}`;
      }
      if (activity.to_value?.startsWith("scheduled:")) {
        const { when, detail } = parseAppointmentActivityValue(
          activity.to_value,
          "scheduled:"
        );
        const base = `${actor} scheduled ${label} for ${formatAppointmentDateTime(when)}`;
        return detail ? `${base} — ${detail}` : base;
      }
      if (activity.to_value?.startsWith("completed:")) {
        const { when, detail } = parseAppointmentActivityValue(
          activity.to_value,
          "completed:"
        );
        const base = `${actor} completed ${label} (${formatAppointmentDateTime(when)})`;
        return detail ? `${base} — ${detail}` : base;
      }
      if (activity.to_value?.startsWith("cancelled:")) {
        const { when, detail } = parseAppointmentActivityValue(
          activity.to_value,
          "cancelled:"
        );
        const base = `${actor} cancelled ${label} (${formatAppointmentDateTime(when)})`;
        return detail ? `${base} — ${detail}` : base;
      }
      return `${actor} edited lead details`;
    }
    default:
      return `${actor} ${ACTION_LABELS[activity.action]}`;
  }
}