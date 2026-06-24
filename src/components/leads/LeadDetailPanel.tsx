"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchLeadHistory } from "@/lib/leads/actions";
import { formatFullAddress, mapsDirectionsUrl } from "@/lib/leads/address";
import { phoneTelHref } from "@/lib/leads/phone";
import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency, formatTimestamp } from "@/lib/leads/format";
import { canEditLead } from "@/lib/leads/permissions";
import type { LeadHistory, LeadWithOwner } from "@/lib/leads/types";
import type { UserRole } from "@/types/database";
import { ClaimLeadButton } from "./ClaimLeadButton";
import { CloseLeadSection } from "./CloseLeadSection";
import { LeadEditDetails } from "./LeadEditDetails";
import { LeadMilestones } from "./LeadMilestones";
import { LeadOwnerReassign } from "./LeadOwnerReassign";
import { LeadValueSection } from "./LeadValueSection";
import { LeadActivityTrail } from "./LeadActivityTrail";
import { LeadNotes } from "./LeadNotes";

interface LeadDetailPanelProps {
  lead: LeadWithOwner | null;
  currentUserId: string;
  currentUserRole: UserRole;
  onClose: () => void;
  onLeadClosed?: () => void;
}

export function LeadDetailPanel({
  lead,
  currentUserId,
  currentUserRole,
  onClose,
  onLeadClosed,
}: LeadDetailPanelProps) {
  const router = useRouter();
  const [history, setHistory] = useState<LeadHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (leadId: string) => {
    setLoading(true);
    setError(null);

    const result = await fetchLeadHistory(leadId);

    if ("error" in result) {
      setError(result.error);
      setHistory(null);
    } else {
      setHistory(result);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!lead) {
      setHistory(null);
      return;
    }

    loadHistory(lead.id);
  }, [lead, loadHistory]);

  useEffect(() => {
    if (!lead) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lead, onClose]);

  if (!lead) return null;

  const fullAddress = formatFullAddress(lead);
  const isActive = lead.status === "active";
  const isUnclaimed = isActive && !lead.owner_id;
  const canEdit = canEditLead(lead, currentUserId, currentUserRole);
  const canClose = isActive && canEdit;
  const isManager = currentUserRole === "manager";
  const showValueSection =
    isActive &&
    canEdit &&
    (lead.stage === "proposal_sent" ||
      lead.stage === "negotiating" ||
      lead.stage === "closed" ||
      lead.value != null);

  function handleClosed() {
    onClose();
    onLeadClosed?.();
    router.refresh();
  }

  function handleClaimed() {
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end sm:justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-field-dark/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md h-full bg-field-dark sm:border-l border-field-line/20 flex flex-col shadow-2xl safe-area-bottom">
        <div className="px-5 py-4 border-b border-field-line/20 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-field-cream truncate">
                {lead.name}
              </h2>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {isActive ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-field-turf/30 text-field-cream/70">
                    {STAGE_LABELS[lead.stage]}
                  </span>
                ) : (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      lead.status === "closed_won"
                        ? "bg-field-gold/20 text-field-gold"
                        : "bg-field-sage/20 text-field-sage"
                    }`}
                  >
                    {lead.status === "closed_won" ? "Won" : "Lost"}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-field-turf/30 text-field-cream/70">
                  {getSourceDisplayLabel(lead.source)}
                </span>
                {!isActive && (
                  <span className="text-xs px-2 py-0.5 rounded bg-field-dark/50 text-field-cream/45">
                    Was {STAGE_LABELS[lead.stage]}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-lg border border-field-line/20 text-field-cream/50 hover:text-field-cream hover:bg-field-turf/20 transition flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-1 text-sm text-field-cream/60">
            {lead.phone && (
              <p>
                {phoneTelHref(lead.phone) ? (
                  <a
                    href={phoneTelHref(lead.phone)}
                    className="text-field-gold/90 hover:text-field-gold transition"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  lead.phone
                )}
              </p>
            )}
            {lead.email && <p className="truncate">{lead.email}</p>}
            {fullAddress && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <p>{fullAddress}</p>
                <a
                  href={mapsDirectionsUrl(fullAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-field-gold hover:text-field-cream transition shrink-0"
                >
                  Directions →
                </a>
              </div>
            )}
            {isManager && isActive ? (
              <LeadOwnerReassign
                lead={lead}
                onReassigned={() => router.refresh()}
              />
            ) : (
              <p className="text-xs text-field-cream/40 pt-1">
                Owner:{" "}
                {lead.owner_id
                  ? lead.owner?.full_name ?? "Unknown"
                  : "Unclaimed"}
              </p>
            )}
            {!isActive && lead.value != null && (
              <p className="text-sm font-semibold text-field-gold pt-1">
                {formatCurrency(lead.value)}
              </p>
            )}
            {lead.closed_at && (
              <p className="text-xs text-field-cream/40">
                Closed {formatTimestamp(lead.closed_at)}
              </p>
            )}
            {lead.lost_reason && (
              <p className="text-xs text-field-sage/90 pt-1 leading-relaxed">
                <span className="font-medium">Coaching note: </span>
                {lead.lost_reason}
              </p>
            )}
            {canEdit && isActive && (
              <div className="pt-1">
                <LeadEditDetails
                  lead={lead}
                  onUpdated={() => loadHistory(lead.id)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {isUnclaimed && (
            <ClaimLeadButton leadId={lead.id} onClaimed={handleClaimed} />
          )}

          {isActive && <LeadMilestones lead={lead} canEdit={canEdit} />}

          {showValueSection && (
            <LeadValueSection
              leadId={lead.id}
              currentValue={lead.value}
              onUpdated={() => router.refresh()}
            />
          )}

          {canClose && (
            <CloseLeadSection leadId={lead.id} onClosed={handleClosed} />
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
              Notes
            </h3>
            <LeadNotes
              leadId={lead.id}
              notes={history?.notes ?? []}
              loading={loading}
              onNoteAdded={() => loadHistory(lead.id)}
            />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
              Activity Trail
            </h3>
            <LeadActivityTrail
              activity={history?.activity ?? []}
              loading={loading}
            />
          </section>
        </div>
      </div>
    </div>
  );
}