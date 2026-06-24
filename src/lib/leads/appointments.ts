import type { AppointmentType, LeadAppointment } from "@/types/database";

export const DEFAULT_APPOINTMENT_DURATION = 90;

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  inspection: "Inspection",
  site_survey: "Site Survey",
};

export const APPOINTMENT_TYPE_SHORT: Record<AppointmentType, string> = {
  inspection: "Inspect",
  site_survey: "Survey",
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