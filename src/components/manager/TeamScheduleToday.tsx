import Link from "next/link";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/leads/appointments";
import { fieldLeadHref } from "@/lib/brief/utils";
import type { TeamAppointmentToday } from "@/lib/manager/schedule";

interface TeamScheduleTodayProps {
  appointments: TeamAppointmentToday[];
}

export function TeamScheduleToday({ appointments }: TeamScheduleTodayProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-4">
        Team Schedule Today
      </h2>
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-field-line/25 bg-field-dark/30 p-5">
          <p className="text-sm text-field-cream/45">
            No site visits on the team calendar today — good day
            for prospecting and follow-ups.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-field-line/20 bg-field-dark/40 overflow-hidden">
          <ul className="divide-y divide-field-line/10">
            {appointments.map((apt) => (
              <li key={apt.id}>
                <Link
                  href={fieldLeadHref(apt.leadId)}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 hover:bg-field-turf/10 transition block"
                >
                  <div className="sm:w-36 shrink-0">
                    <p className="text-xs font-semibold text-field-gold">
                      {apt.formattedTime}
                    </p>
                    <p className="text-[10px] text-field-cream/40">
                      {APPOINTMENT_TYPE_LABELS[apt.appointmentType]}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-field-cream truncate">
                      {apt.leadName}
                    </p>
                    {apt.location && (
                      <p className="text-xs text-field-cream/45 truncate">
                        {apt.location}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-field-cream/55 shrink-0">
                    {apt.repName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}