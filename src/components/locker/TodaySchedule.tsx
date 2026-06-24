import Link from "next/link";
import {
  APPOINTMENT_TYPE_LABELS,
  formatAppointmentDateTime,
} from "@/lib/leads/appointments";
import { phoneTelHref } from "@/lib/leads/phone";
import type { TodayAppointment } from "@/lib/brief/types";
import { fieldLeadHref } from "@/lib/brief/utils";

interface TodayScheduleProps {
  appointments: TodayAppointment[];
}

export function TodaySchedule({ appointments }: TodayScheduleProps) {
  if (appointments.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-field-line/25 bg-field-dark/30 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-2">
          Today&apos;s Game Plan
        </h2>
        <p className="text-sm text-field-cream/45">
          Open calendar — nothing on the books today. Work the coach&apos;s calls
          or pull fresh leads from the pool.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-dark/40 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-4">
        Today&apos;s Game Plan
      </h2>
      <ul className="space-y-2">
        {appointments.map((apt) => {
          const tel = apt.phone ? phoneTelHref(apt.phone) : "";
          const borderClass = apt.isOverdue
            ? "border-red-800/40 bg-red-950/20"
            : apt.isSoon
              ? "border-field-gold/40 bg-field-gold/10"
              : "border-field-line/20 bg-field-turf/10";

          return (
            <li key={apt.id}>
              <Link
                href={fieldLeadHref(apt.leadId)}
                className={`flex items-start gap-3 rounded-lg border p-3 transition hover:bg-field-turf/15 ${borderClass}`}
              >
                <span className="text-lg shrink-0" aria-hidden>
                  {apt.isOverdue ? "⚠" : apt.appointmentType === "inspection" ? "📅" : "🏠"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-field-cream truncate">
                    {apt.leadName}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      apt.isOverdue ? "text-red-300" : "text-field-gold"
                    }`}
                  >
                    {APPOINTMENT_TYPE_LABELS[apt.appointmentType]} ·{" "}
                    {formatAppointmentDateTime(apt.scheduledAt)}
                  </p>
                  {apt.location && (
                    <p className="text-xs text-field-cream/45 mt-0.5 truncate">
                      {apt.location}
                    </p>
                  )}
                  {tel && (
                    <a
                      href={tel}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-field-cream/55 hover:text-field-gold mt-1 inline-block"
                    >
                      Call {apt.phone}
                    </a>
                  )}
                </div>
                {apt.isOverdue ? (
                  <span className="shrink-0 text-[10px] font-bold uppercase text-red-300">
                    Overdue
                  </span>
                ) : apt.isSoon ? (
                  <span className="shrink-0 text-[10px] font-bold uppercase text-field-gold">
                    Soon
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}