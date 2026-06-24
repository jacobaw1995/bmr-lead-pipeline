"use client";

import { useEffect, useState } from "react";
import {
  APPOINTMENT_TYPE_LABELS,
  DEFAULT_APPOINTMENT_DURATION,
} from "@/lib/leads/appointments";
import { scheduleAppointment } from "@/lib/leads/actions";
import type { AppointmentType } from "@/types/database";
import {
  ScheduleDateTimePicker,
  defaultScheduleDateTime,
} from "./ScheduleDateTimePicker";

interface ScheduleAppointmentModalProps {
  open: boolean;
  leadId: string;
  appointmentType: AppointmentType;
  onClose: () => void;
  onScheduled: () => void;
}

export function ScheduleAppointmentModal({
  open,
  leadId,
  appointmentType,
  onClose,
  onScheduled,
}: ScheduleAppointmentModalProps) {
  const [datetime, setDatetime] = useState(defaultScheduleDateTime);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDatetime(defaultScheduleDateTime());
      setError(null);
    }
  }, [open, appointmentType]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await scheduleAppointment(
      leadId,
      appointmentType,
      new Date(datetime).toISOString(),
      DEFAULT_APPOINTMENT_DURATION
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onScheduled();
    onClose();
  }

  const label = APPOINTMENT_TYPE_LABELS[appointmentType];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-field-dark/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl border border-field-line/30 bg-field-dark shadow-xl max-h-[90vh] overflow-y-auto safe-area-bottom">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-field-line/30" />
        </div>

        <div className="px-5 py-4 border-b border-field-line/20">
          <h3 className="text-lg font-semibold text-field-cream">
            Schedule {label}
          </h3>
          <p className="text-xs text-field-cream/50 mt-0.5">
            {DEFAULT_APPOINTMENT_DURATION}-minute block — double-booking is
            blocked automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <ScheduleDateTimePicker value={datetime} onChange={setDatetime} />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-lg border border-field-line/30 px-4 py-2.5 text-sm font-medium text-field-cream/70 hover:bg-field-turf/20 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[44px] rounded-lg bg-field-gold px-4 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}