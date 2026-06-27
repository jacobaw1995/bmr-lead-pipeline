"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addLeadNote,
  completeAppointment,
  moveLeadStage,
  setLeadValue,
  toggleMilestone,
} from "@/lib/leads/actions";
import {
  SITE_VISIT_APPOINTMENT_TYPE,
  getSiteVisitAppointment,
} from "@/lib/leads/appointments";
import {
  COMMAND_STAGES,
  canMarkStageComplete,
  getMarkCompleteLabel,
  type CommandStageKey,
} from "@/lib/leads/command-center";
import { getPrimaryPhone } from "@/lib/leads/profile";
import { phoneSmsHref, phoneTelHref } from "@/lib/leads/phone";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";
import { ScheduleAppointmentModal } from "./ScheduleAppointmentModal";

interface LeadQuickActionsProps {
  lead: LeadWithOwner;
  canEdit: boolean;
  notes: NoteWithAuthor[];
  view: CommandStageKey;
  onRefresh: () => void;
  onToast: (message: string) => void;
  onOpenCloseDeal: () => void;
  onViewChange: (view: CommandStageKey) => void;
  compact?: boolean;
}

export function LeadQuickActions({
  lead,
  canEdit,
  notes,
  view,
  onRefresh,
  onToast,
  onOpenCloseDeal,
  onViewChange,
  compact = false,
}: LeadQuickActionsProps) {
  const router = useRouter();
  const appointments = lead.appointments ?? [];
  const siteVisit = getSiteVisitAppointment(appointments);
  const primaryPhone = getPrimaryPhone(lead);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [quoteInput, setQuoteInput] = useState(
    lead.value != null ? String(lead.value) : ""
  );

  const markLabel = getMarkCompleteLabel(view);
  const showMarkComplete = canMarkStageComplete(
    view,
    lead,
    appointments,
    canEdit,
    notes
  );
  const showCloseDeal =
    canEdit &&
    lead.status === "active" &&
    (view === "negotiating" || view === "closed");
  const showSchedule =
    canEdit &&
    lead.status === "active" &&
    (view === "new_lead" || view === "site_visit") &&
    !siteVisit;
  const showEditQuote =
    canEdit &&
    lead.status === "active" &&
    (view === "quote" || view === "negotiating");

  async function handleMarkComplete() {
    if (!canEdit || loading) return;
    setError(null);
    setLoading(true);

    let result: { success: boolean; error?: string } = { success: false };

    switch (view) {
      case "new_lead":
        result = await moveLeadStage(lead.id, "qualified");
        if (result.success) onToast("Lead marked as Qualified");
        break;
      case "site_visit":
        if (siteVisit?.state === "scheduled") {
          result = await completeAppointment(siteVisit.appointment.id);
          if (result.success) onToast("Site visit marked complete");
        }
        break;
      case "scope":
        result = await toggleMilestone(lead.id, "roof_scope_ordered", true);
        if (result.success) onToast("Scope marked as ordered");
        break;
      case "quote":
        result = await toggleMilestone(lead.id, "quote_presented", true);
        if (result.success) onToast("Quote marked as presented");
        break;
      case "negotiating":
        result = await moveLeadStage(lead.id, "negotiating");
        if (result.success) onToast("Moved to Negotiating");
        break;
      default:
        break;
    }

    if (!result.success) {
      setError(result.error ?? "Could not update stage.");
      setLoading(false);
      return;
    }

    setLoading(false);
    const nextIndex = COMMAND_STAGES.findIndex((s) => s.key === view) + 1;
    if (nextIndex < COMMAND_STAGES.length) {
      const next = COMMAND_STAGES[nextIndex];
      if (next.key !== "closed" || lead.status !== "active") {
        onViewChange(next.key);
      }
    }
    onRefresh();
    router.refresh();
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await addLeadNote(lead.id, noteContent);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setNoteContent("");
    setLogOpen(false);
    setLoading(false);
    onToast("Activity logged");
    onRefresh();
    router.refresh();
  }

  async function handleSaveQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsed =
      quoteInput.trim() === "" ? null : parseFloat(quoteInput.replace(/,/g, ""));

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setError("Enter a valid dollar amount.");
      setLoading(false);
      return;
    }

    const result = await setLeadValue(lead.id, parsed);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setQuoteOpen(false);
    setLoading(false);
    onToast("Quote value saved");
    onRefresh();
    router.refresh();
  }

  const buttonClass = compact
    ? "min-h-[40px] flex items-center justify-center rounded-lg border border-field-line/25 bg-field-dark/40 px-2 text-xs font-semibold text-field-cream hover:bg-field-turf/25 hover:border-field-gold/40 transition"
    : "min-h-[48px] flex items-center justify-center rounded-xl border border-field-line/25 bg-field-dark/40 px-3 text-sm font-semibold text-field-cream hover:bg-field-turf/25 hover:border-field-gold/40 transition";

  return (
    <>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-2.5">
          Quick actions
        </h3>
        {error && (
          <div className="mb-2 rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div
          className={`grid gap-2 ${
            compact ? "grid-cols-2" : "grid-cols-2"
          }`}
        >
          {primaryPhone && phoneTelHref(primaryPhone) && (
            <a href={phoneTelHref(primaryPhone)} className={buttonClass}>
              Call
            </a>
          )}
          {primaryPhone && phoneSmsHref(primaryPhone) && (
            <a href={phoneSmsHref(primaryPhone)} className={buttonClass}>
              Text
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={buttonClass}>
              Email
            </a>
          )}
          {showSchedule && (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className={buttonClass}
            >
              Schedule
            </button>
          )}
          {showEditQuote && (
            <button
              type="button"
              onClick={() => {
                setQuoteInput(lead.value != null ? String(lead.value) : "");
                setQuoteOpen(true);
              }}
              className={buttonClass}
            >
              Edit Quote
            </button>
          )}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className={buttonClass}
          >
            Log Activity
          </button>
          {showMarkComplete && (
            <button
              type="button"
              disabled={loading}
              onClick={handleMarkComplete}
              className={`col-span-2 rounded-xl bg-field-gold px-4 text-sm font-bold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50 ${
                compact ? "min-h-[40px]" : "min-h-[48px]"
              }`}
            >
              {loading ? "Updating…" : markLabel}
            </button>
          )}
          {showCloseDeal && (
            <button
              type="button"
              onClick={onOpenCloseDeal}
              className={`col-span-2 rounded-xl border-2 border-field-gold/60 bg-field-gold/10 px-4 text-sm font-bold text-field-gold hover:bg-field-gold/20 transition ${
                compact ? "min-h-[40px]" : "min-h-[48px]"
              }`}
            >
              Close Deal
            </button>
          )}
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleAppointmentModal
          open
          leadId={lead.id}
          appointmentType={SITE_VISIT_APPOINTMENT_TYPE}
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => {
            setScheduleOpen(false);
            onRefresh();
            router.refresh();
          }}
        />
      )}

      {logOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-field-dark/70"
            onClick={() => setLogOpen(false)}
          />
          <form
            onSubmit={handleLogActivity}
            className="relative w-full max-w-md rounded-xl border border-field-line/25 bg-field-dark p-5 shadow-2xl space-y-3"
          >
            <h3 className="text-lg font-bold text-field-cream">Log Activity</h3>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Capture objections, follow-ups, or site notes…"
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="min-h-[48px] px-4 text-sm text-field-cream/60 hover:text-field-cream"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !noteContent.trim()}
                className="min-h-[48px] rounded-lg bg-field-gold px-5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save note"}
              </button>
            </div>
          </form>
        </div>
      )}

      {quoteOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-field-dark/70"
            onClick={() => setQuoteOpen(false)}
          />
          <form
            onSubmit={handleSaveQuote}
            className="relative w-full max-w-md rounded-xl border border-field-gold/30 bg-field-dark p-5 shadow-2xl space-y-3"
          >
            <h3 className="text-lg font-bold text-field-cream">Edit Quote</h3>
            <p className="text-xs text-field-cream/45">
              Set the deal value for this lead.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-field-cream/40 text-sm">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={quoteInput}
                onChange={(e) => setQuoteInput(e.target.value)}
                placeholder="12,500"
                autoFocus
                className="w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-turf/10 pl-7 pr-3 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setQuoteOpen(false)}
                className="min-h-[48px] px-4 text-sm text-field-cream/60 hover:text-field-cream"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] rounded-lg bg-field-gold px-5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save quote"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}