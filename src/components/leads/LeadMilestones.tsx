"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelAppointment,
  completeAppointment,
  toggleMilestone,
} from "@/lib/leads/actions";
import {
  SITE_VISIT_APPOINTMENT_TYPE,
  formatAppointmentDateTime,
  getSiteVisitAppointment,
} from "@/lib/leads/appointments";
import {
  SCHEDULABLE_STEPS,
  TOGGLE_MILESTONES,
  getMilestoneProgress,
  type MilestoneKey,
} from "@/lib/leads/milestones";
import type { LeadWithOwner } from "@/lib/leads/types";
import { ScheduleAppointmentModal } from "./ScheduleAppointmentModal";

interface LeadMilestonesProps {
  lead: LeadWithOwner;
  canEdit: boolean;
}

export function LeadMilestones({ lead, canEdit }: LeadMilestonesProps) {
  const router = useRouter();
  const appointments = lead.appointments ?? [];
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const siteVisit = getSiteVisitAppointment(appointments);
  const progress = getMilestoneProgress(lead, appointments);

  async function handleToggle(key: MilestoneKey, currentlyDone: boolean) {
    if (!canEdit) return;
    setError(null);
    setLoading(key);

    const result = await toggleMilestone(lead.id, key, !currentlyDone);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  }

  async function handleCompleteAppointment(appointmentId: string) {
    if (!canEdit) return;
    setError(null);
    setLoading(appointmentId);

    const result = await completeAppointment(appointmentId);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  }

  async function handleCancelAppointment(appointmentId: string) {
    if (!canEdit) return;
    setError(null);
    setLoading(appointmentId);

    const result = await cancelAppointment(appointmentId);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <>
      <section className="rounded-xl border border-field-line/20 bg-field-turf/10 p-4 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none field-pattern"
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
              Job Path
            </h3>
            <span className="text-xs font-mono text-field-cream/40">
              {progress}%
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-field-dark/40 mb-5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-field-turf to-field-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <div className="space-y-2">
            {SCHEDULABLE_STEPS.map((step) => {
              const isLoading =
                loading === step.key ||
                (siteVisit && loading === siteVisit.appointment.id);

              return (
                <div
                  key={step.key}
                  className={`rounded-lg border p-3 ${
                    siteVisit?.state === "scheduled"
                      ? "border-field-gold/50 bg-field-gold/10"
                      : siteVisit?.state === "completed"
                        ? "border-field-sage/40 bg-field-sage/10"
                        : "border-field-line/20 bg-field-dark/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0" aria-hidden>
                      {step.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-field-cream">
                        {step.label}
                      </p>
                      {siteVisit?.state === "scheduled" ? (
                        <p className="text-xs text-field-gold mt-0.5">
                          {formatAppointmentDateTime(
                            siteVisit.appointment.scheduled_at
                          )}
                        </p>
                      ) : siteVisit?.state === "completed" ? (
                        <p className="text-xs text-field-sage mt-0.5">
                          Completed ·{" "}
                          {formatAppointmentDateTime(
                            siteVisit.appointment.scheduled_at
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-field-cream/40 mt-0.5">
                          Not scheduled yet
                        </p>
                      )}
                      {canEdit && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            disabled={!!isLoading}
                            onClick={() => setScheduleOpen(true)}
                            className="text-xs font-medium text-field-gold hover:text-field-cream transition disabled:opacity-50"
                          >
                            {siteVisit?.state === "scheduled"
                              ? "Reschedule"
                              : "Schedule"}
                          </button>
                          {siteVisit?.state === "scheduled" && (
                            <>
                              <button
                                type="button"
                                disabled={!!isLoading}
                                onClick={() =>
                                  handleCompleteAppointment(
                                    siteVisit.appointment.id
                                  )
                                }
                                className="text-xs font-medium text-field-cream/70 hover:text-field-cream transition disabled:opacity-50"
                              >
                                Mark complete
                              </button>
                              <button
                                type="button"
                                disabled={!!isLoading}
                                onClick={() =>
                                  handleCancelAppointment(
                                    siteVisit.appointment.id
                                  )
                                }
                                className="text-xs font-medium text-field-cream/40 hover:text-field-sage transition disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {TOGGLE_MILESTONES.map((milestone) => {
                const done = lead[milestone.field] != null;
                const isLoading = loading === milestone.key;

                return (
                  <button
                    key={milestone.key}
                    type="button"
                    disabled={!canEdit || isLoading}
                    onClick={() => handleToggle(milestone.key, done)}
                    className={`relative rounded-lg border p-2.5 text-left transition-all ${
                      done
                        ? "border-field-gold/50 bg-field-gold/15"
                        : "border-field-line/20 bg-field-dark/30 hover:border-field-line/35"
                    } ${canEdit ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
                  >
                    <span className="text-lg block mb-1" aria-hidden>
                      {milestone.icon}
                    </span>
                    <span
                      className={`text-[10px] font-semibold leading-tight block ${
                        done ? "text-field-cream" : "text-field-cream/55"
                      }`}
                    >
                      {milestone.shortLabel}
                    </span>
                    <span className="text-[9px] text-field-cream/40 mt-0.5 block">
                      {done ? "Done" : "Tap"}
                    </span>
                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-field-dark/40 rounded-lg text-xs">
                        …
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!canEdit && (
            <p className="text-[10px] text-field-cream/35 mt-3 text-center">
              Claim or own this lead to update the job path
            </p>
          )}
        </div>
      </section>

      {scheduleOpen && (
        <ScheduleAppointmentModal
          open
          leadId={lead.id}
          appointmentType={SITE_VISIT_APPOINTMENT_TYPE}
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => router.refresh()}
        />
      )}
    </>
  );
}