"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchLeadHistory } from "@/lib/leads/actions";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import { canEditLead } from "@/lib/leads/permissions";
import type { LeadHistory, LeadWithOwner } from "@/lib/leads/types";
import type { UserRole } from "@/types/database";
import { CloseLeadSection } from "./CloseLeadSection";
import { LeadCommandCenter } from "./LeadCommandCenter";
import { LeadProspectPanel } from "./LeadProspectPanel";
import { LeadToast } from "./LeadToast";

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
  const [toast, setToast] = useState<string | null>(null);
  const [closeDealOpen, setCloseDealOpen] = useState(false);

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
      if (e.key === "Escape") {
        if (closeDealOpen) {
          setCloseDealOpen(false);
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lead, onClose, closeDealOpen]);

  if (!lead) return null;

  const displayName = formatLeadDisplayName(lead);
  const canEdit = canEditLead(lead, currentUserId, currentUserRole);
  const isManager = currentUserRole === "manager";

  function handleClosed() {
    setCloseDealOpen(false);
    onClose();
    onLeadClosed?.();
    router.refresh();
  }

  function handleRefresh() {
    loadHistory(lead!.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-field-dark/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative flex flex-col sm:flex-row w-full max-w-6xl h-full sm:h-[min(100%,900px)] sm:my-auto mx-auto bg-field-dark sm:rounded-2xl sm:border border-field-line/20 shadow-2xl overflow-hidden safe-area-bottom">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 hidden sm:flex shrink-0 w-9 h-9 rounded-lg border border-field-line/20 text-field-cream/50 hover:text-field-cream hover:bg-field-turf/20 transition items-center justify-center"
          aria-label={`Close ${displayName}`}
        >
          ✕
        </button>

        <div className="sm:hidden shrink-0 flex items-start border-b border-field-line/20 bg-field-dark/95">
          <div className="flex-1 min-w-0">
            <LeadProspectPanel
              lead={lead}
              history={history}
              loading={loading}
              canEdit={canEdit}
              isManager={isManager}
              onUpdated={handleRefresh}
              accordion
            />
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-12 min-h-[48px] flex items-center justify-center border-l border-field-line/15 text-field-cream/50 hover:text-field-cream hover:bg-field-turf/20 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {error && (
            <div className="shrink-0 mx-4 mt-3 rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <LeadCommandCenter
            lead={lead}
            canEdit={canEdit}
            notes={history?.notes ?? []}
            onRefresh={handleRefresh}
            onToast={setToast}
            onOpenCloseDeal={() => setCloseDealOpen(true)}
          />
        </div>

        <div className="hidden sm:flex min-h-0">
          <LeadProspectPanel
            lead={lead}
            history={history}
            loading={loading}
            canEdit={canEdit}
            isManager={isManager}
            onUpdated={handleRefresh}
          />
        </div>
      </div>

      <LeadToast message={toast} onDismiss={() => setToast(null)} />

      {closeDealOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-field-dark/70"
            onClick={() => setCloseDealOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-field-line/25 bg-field-dark p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-field-cream mb-4">Close deal</h3>
            <CloseLeadSection leadId={lead.id} onClosed={handleClosed} />
          </div>
        </div>
      )}
    </div>
  );
}