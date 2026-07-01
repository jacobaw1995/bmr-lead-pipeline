"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  APPOINTMENT_TYPE_LABELS,
  formatAppointmentDateTime,
  formatAppointmentTitle,
} from "@/lib/leads/appointments";
import { phoneTelHref } from "@/lib/leads/phone";
import type { CalendarRepFilter, CalendarSiteVisit } from "@/lib/calendar/types";
import {
  buildFieldHref,
  buildMonthGrid,
  formatDayHeading,
  formatMonthKey,
  formatMonthLabel,
  formatTime,
  sameDay,
  shiftMonth,
} from "@/lib/calendar/utils";
import type { AppointmentStatus } from "@/types/database";

interface SiteVisitCalendarProps {
  appointments: CalendarSiteVisit[];
  year: number;
  month: number;
  currentUserId: string;
  isManager: boolean;
  /** Preserved when opening a lead from the calendar while in Field view. */
  contextLeadId?: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-field-turf/20 text-field-cream border-field-line/25",
  completed: "bg-field-sage/15 text-field-sage border-field-sage/30",
  cancelled: "bg-field-cream/5 text-field-cream/40 border-field-line/15 line-through",
  no_show: "bg-red-950/25 text-red-300 border-red-800/30",
};

export function SiteVisitCalendar({
  appointments,
  year,
  month,
  currentUserId,
  isManager,
  contextLeadId = null,
}: SiteVisitCalendarProps) {
  const monthKey = formatMonthKey(year, month);
  const monthHref = (y: number, m: number) =>
    buildFieldHref({
      view: "calendar",
      month: formatMonthKey(y, m),
      lead: contextLeadId,
    });
  const leadHref = (leadId: string) =>
    buildFieldHref({ view: "calendar", month: monthKey, lead: leadId });
  const [repFilter, setRepFilter] = useState<CalendarRepFilter>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const now = new Date();
  const monthLabel = formatMonthLabel(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const todayKey = formatMonthKey(now.getFullYear(), now.getMonth());

  const reps = useMemo(() => {
    const map = new Map<string, string>();
    for (const apt of appointments) {
      map.set(apt.repId, apt.repName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  const filtered = useMemo(() => {
    let list = appointments;
    if (repFilter === "mine") {
      list = list.filter((a) => a.repId === currentUserId);
    } else if (repFilter !== "all") {
      list = list.filter((a) => a.repId === repFilter);
    }
    if (selectedDay) {
      list = list.filter((a) => sameDay(new Date(a.scheduledAt), selectedDay));
    }
    return list;
  }, [appointments, repFilter, currentUserId, selectedDay]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarSiteVisit[]>();
    for (const apt of filtered) {
      const key = new Date(apt.scheduledAt).toDateString();
      const group = map.get(key) ?? [];
      group.push(apt);
      map.set(key, group);
    }
    return Array.from(map.entries()).sort(
      ([, a], [, b]) =>
        new Date(a[0].scheduledAt).getTime() -
        new Date(b[0].scheduledAt).getTime()
    );
  }, [filtered]);

  const visitsByDate = useMemo(() => {
    const map = new Map<string, number>();
    let list = appointments;
    if (repFilter === "mine") {
      list = list.filter((a) => a.repId === currentUserId);
    } else if (repFilter !== "all") {
      list = list.filter((a) => a.repId === repFilter);
    }
    for (const apt of list) {
      const key = new Date(apt.scheduledAt).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [appointments, repFilter, currentUserId]);

  const grid = buildMonthGrid(year, month);
  const scheduledCount = filtered.filter((a) => a.status === "scheduled").length;
  const completedCount = filtered.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={monthHref(prev.year, prev.month)}
            className="w-9 h-9 rounded-lg border border-field-line/20 text-field-cream/70 hover:bg-field-turf/20 flex items-center justify-center transition"
            aria-label="Previous month"
          >
            ‹
          </Link>
          <h2 className="text-lg font-semibold text-field-cream min-w-[10rem] text-center">
            {monthLabel}
          </h2>
          <Link
            href={monthHref(next.year, next.month)}
            className="w-9 h-9 rounded-lg border border-field-line/20 text-field-cream/70 hover:bg-field-turf/20 flex items-center justify-center transition"
            aria-label="Next month"
          >
            ›
          </Link>
          {formatMonthKey(year, month) !== todayKey && (
            <Link
              href={buildFieldHref({ view: "calendar", lead: contextLeadId })}
              className="ml-1 text-xs font-medium text-field-gold hover:text-field-cream transition px-2 py-1 rounded border border-field-gold/30"
            >
              Today
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isManager ? (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value as CalendarRepFilter)}
              className="text-sm rounded-lg border border-field-line/25 bg-field-dark/60 text-field-cream px-3 py-2"
              aria-label="Filter by sales rep"
            >
              <option value="all">All reps</option>
              <option value="mine">My visits</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value as CalendarRepFilter)}
              className="text-sm rounded-lg border border-field-line/25 bg-field-dark/60 text-field-cream px-3 py-2"
              aria-label="Filter visits"
            >
              <option value="all">All visits</option>
              <option value="mine">My visits</option>
            </select>
          )}

          <div className="flex gap-3 text-xs text-field-cream/50">
            <span>
              <span className="text-field-gold font-semibold">{scheduledCount}</span>{" "}
              scheduled
            </span>
            <span>
              <span className="text-field-sage font-semibold">{completedCount}</span>{" "}
              completed
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-field-line/20 bg-field-dark/40 p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-field-cream/40 py-1"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const inMonth = date.getMonth() === month;
            const isToday = sameDay(date, now);
            const count = visitsByDate.get(date.toDateString()) ?? 0;
            const isSelected =
              selectedDay != null && sameDay(date, selectedDay);

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() =>
                  setSelectedDay((prev) =>
                    prev && sameDay(prev, date) ? null : date
                  )
                }
                className={`min-h-[3.25rem] rounded-lg p-1 text-left transition ${
                  inMonth
                    ? "text-field-cream hover:bg-field-turf/15"
                    : "text-field-cream/25"
                } ${
                  isSelected
                    ? "ring-2 ring-field-gold/60 bg-field-gold/10"
                    : isToday
                      ? "bg-field-turf/20"
                      : ""
                }`}
              >
                <span
                  className={`text-xs font-medium block ${
                    isToday ? "text-field-gold" : ""
                  }`}
                >
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <span className="mt-0.5 flex gap-0.5 flex-wrap">
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-field-gold"
                      />
                    ))}
                    {count > 3 && (
                      <span className="text-[9px] text-field-gold/80">
                        +{count - 3}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="mt-3 text-xs text-field-gold hover:text-field-cream transition"
          >
            Show full month ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-field-line/25 bg-field-dark/30 p-8 text-center">
          <p className="text-sm text-field-cream/45">
            {selectedDay
              ? `No site visits on ${formatDayHeading(selectedDay)}.`
              : "No site visits this month — schedule surveys from the pipeline view."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byDay.map(([dayKey, dayAppointments]) => (
            <section key={dayKey}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
                {formatDayHeading(new Date(dayKey))}
              </h3>
              <ul className="space-y-2">
                {dayAppointments.map((apt) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    leadHref={leadHref}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentRow({
  appointment: apt,
  leadHref,
}: {
  appointment: CalendarSiteVisit;
  leadHref: (leadId: string) => string;
}) {
  const tel = apt.phone ? phoneTelHref(apt.phone) : "";
  const borderClass = apt.isOverdue
    ? "border-red-800/40 bg-red-950/20"
    : apt.status === "completed"
      ? "border-field-sage/25 bg-field-sage/5"
      : apt.status === "cancelled" || apt.status === "no_show"
        ? "border-field-line/15 bg-field-dark/20 opacity-75"
        : "border-field-line/20 bg-field-turf/10";

  return (
    <li>
      <Link
        href={leadHref(apt.leadId)}
        className={`flex items-start gap-3 rounded-lg border p-3 transition hover:bg-field-turf/15 ${borderClass}`}
      >
        <div className="shrink-0 w-16 text-center">
          <p className="text-sm font-semibold text-field-gold">
            {formatTime(apt.scheduledAt)}
          </p>
          <p className="text-[10px] text-field-cream/40 mt-0.5">
            {apt.durationMinutes}m
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-field-cream truncate">
            {apt.leadName}
          </p>
          {apt.title && (
            <p className="text-xs text-field-gold/90 mt-0.5 truncate">
              {formatAppointmentTitle({
                title: apt.title,
                appointment_type: apt.appointmentType,
              })}
            </p>
          )}
          <p className="text-xs text-field-cream/50 mt-0.5">
            {APPOINTMENT_TYPE_LABELS[apt.appointmentType]} ·{" "}
            {formatAppointmentDateTime(apt.scheduledAt)}
          </p>
          {apt.location && (
            <p className="text-xs text-field-cream/45 mt-0.5 truncate">
              {apt.location}
            </p>
          )}
          {apt.notes && (
            <p className="text-xs text-field-cream/40 mt-1 line-clamp-2">
              {apt.notes}
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
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-xs text-field-cream/55">{apt.repName}</span>
          {apt.isOverdue ? (
            <span className="text-[10px] font-bold uppercase text-red-300">
              Overdue
            </span>
          ) : (
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[apt.status]}`}
            >
              {STATUS_LABELS[apt.status]}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}