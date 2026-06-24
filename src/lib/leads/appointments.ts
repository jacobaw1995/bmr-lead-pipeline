import type { AppointmentType, LeadAppointment } from "@/types/database";

export const DEFAULT_APPOINTMENT_DURATION = 90;

/** Canonical type for new site-visit appointments (inspection is a legacy alias). */
export const SITE_VISIT_APPOINTMENT_TYPE: AppointmentType = "site_survey";

export const SITE_VISIT_APPOINTMENT_TYPES: AppointmentType[] = [
  "site_survey",
  "inspection",
];

export function isSiteVisitAppointmentType(type: AppointmentType): boolean {
  return SITE_VISIT_APPOINTMENT_TYPES.includes(type);
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  inspection: "Site Visit",
  site_survey: "Site Visit",
};

export const APPOINTMENT_TYPE_SHORT: Record<AppointmentType, string> = {
  inspection: "Visit",
  site_survey: "Visit",
};

export function formatAppointmentDateTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAppointmentShort(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact badge for pipeline cards, e.g. "Thu 2p · Survey" */
export function formatAppointmentCardBadge(
  iso: string,
  type: AppointmentType
): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const day = isToday
    ? "Today"
    : date.toLocaleDateString(undefined, { weekday: "short" });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} ${time} · ${APPOINTMENT_TYPE_SHORT[type]}`;
}

export function isAppointmentOverdue(
  scheduledAt: string,
  now: Date = new Date()
): boolean {
  return new Date(scheduledAt).getTime() < now.getTime();
}

export function isAppointmentToday(
  scheduledAt: string,
  now: Date = new Date()
): boolean {
  return new Date(scheduledAt).toDateString() === now.toDateString();
}

export function getActiveAppointment(
  appointments: LeadAppointment[] | undefined,
  type: AppointmentType
): LeadAppointment | null {
  if (!appointments?.length) return null;
  return (
    appointments.find(
      (a) => a.appointment_type === type && a.status === "scheduled"
    ) ?? null
  );
}

export type SiteVisitAppointmentState = "scheduled" | "completed";

export function getSiteVisitAppointment(
  appointments: LeadAppointment[] | undefined
): { appointment: LeadAppointment; state: SiteVisitAppointmentState } | null {
  if (!appointments?.length) return null;

  const siteVisits = appointments.filter((a) =>
    isSiteVisitAppointmentType(a.appointment_type)
  );

  const scheduled = siteVisits.find((a) => a.status === "scheduled");
  if (scheduled) {
    return { appointment: scheduled, state: "scheduled" };
  }

  const completed = siteVisits
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.scheduled_at).getTime() -
        new Date(a.completed_at ?? a.scheduled_at).getTime()
    );

  if (completed[0]) {
    return { appointment: completed[0], state: "completed" };
  }

  return null;
}

export function hasSiteVisitAppointment(
  appointments: LeadAppointment[] | undefined
): boolean {
  return getSiteVisitAppointment(appointments) != null;
}

export function getNextScheduledAppointment(
  appointments: LeadAppointment[] | undefined
): LeadAppointment | null {
  if (!appointments?.length) return null;
  const now = Date.now();
  const upcoming = appointments
    .filter(
      (a) =>
        a.status === "scheduled" && new Date(a.scheduled_at).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  return upcoming[0] ?? null;
}

export function getDisplayAppointment(
  appointments: LeadAppointment[] | undefined,
  now: Date = new Date()
): { appointment: LeadAppointment; overdue: boolean } | null {
  if (!appointments?.length) return null;

  const scheduled = appointments.filter((a) => a.status === "scheduled");
  const overdueToday = scheduled
    .filter(
      (a) =>
        isAppointmentToday(a.scheduled_at, now) &&
        isAppointmentOverdue(a.scheduled_at, now)
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

  if (overdueToday[0]) {
    return { appointment: overdueToday[0], overdue: true };
  }

  const next = getNextScheduledAppointment(appointments);
  return next ? { appointment: next, overdue: false } : null;
}