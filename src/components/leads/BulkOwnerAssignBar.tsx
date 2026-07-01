"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { batchReassignLeads, fetchAssignableReps } from "@/lib/leads/actions";
import { summarizeLeadFilters, type LeadSearchFilters } from "@/lib/leads/search";
import type { LeadWithOwner } from "@/lib/leads/types";

interface BulkOwnerAssignBarProps {
  filteredLeads: LeadWithOwner[];
  filters: LeadSearchFilters;
  onComplete?: () => void;
}

export function BulkOwnerAssignBar({
  filteredLeads,
  filters,
  onComplete,
}: BulkOwnerAssignBarProps) {
  const router = useRouter();
  const [reps, setReps] = useState<{ id: string; full_name: string }[]>([]);
  const [targetOwnerId, setTargetOwnerId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const assignableLeads = useMemo(
    () => filteredLeads.filter((lead) => lead.status === "active"),
    [filteredLeads]
  );

  const ownerNameById = useMemo(
    () =>
      Object.fromEntries(reps.map((rep) => [rep.id, rep.full_name])),
    [reps]
  );

  const filterSummary = useMemo(
    () => summarizeLeadFilters(filters, ownerNameById),
    [filters, ownerNameById]
  );

  const targetLabel =
    targetOwnerId === ""
      ? "Unclaimed (pool)"
      : (reps.find((rep) => rep.id === targetOwnerId)?.full_name ?? "selected rep");

  useEffect(() => {
    fetchAssignableReps().then((response) => {
      if (response.success) setReps(response.reps);
    });
  }, []);

  if (assignableLeads.length === 0) return null;

  async function handleConfirm() {
    setError(null);
    setLoading(true);

    const ownerId = targetOwnerId === "" ? null : targetOwnerId;
    const response = await batchReassignLeads(
      assignableLeads.map((lead) => lead.id),
      ownerId
    );

    if (!response.success) {
      setError(response.error);
      setLoading(false);
      return;
    }

    const skippedNote =
      response.skipped > 0 ? ` (${response.skipped} skipped)` : "";
    setResultMessage(
      `Assigned ${response.updated} lead${response.updated === 1 ? "" : "s"} to ${targetLabel}${skippedNote}`
    );
    setLoading(false);
    setConfirmOpen(false);
    onComplete?.();
    router.refresh();
  }

  return (
    <>
      <div className="rounded-xl border border-field-gold/25 bg-field-gold/5 px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-field-gold">
              Batch assign
            </p>
            <p className="text-xs text-field-cream/55 mt-0.5">
              {assignableLeads.length} active lead
              {assignableLeads.length === 1 ? "" : "s"} match{" "}
              <span className="text-field-cream/70">{filterSummary}</span>
            </p>
            {resultMessage && (
              <p className="text-xs text-field-sage mt-1">{resultMessage}</p>
            )}
            {error && !confirmOpen && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={targetOwnerId}
              onChange={(e) => {
                setTargetOwnerId(e.target.value);
                setResultMessage(null);
                setError(null);
              }}
              aria-label="Assign leads to"
              className="min-h-[40px] rounded-lg border border-field-line/25 bg-field-dark/60 text-field-cream text-sm px-3 py-2"
            >
              <option value="">Unclaimed (pool)</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmOpen(true);
              }}
              className="min-h-[40px] rounded-lg bg-field-gold px-4 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition whitespace-nowrap"
            >
              Assign {assignableLeads.length}
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-field-dark/75"
            onClick={() => !loading && setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-field-gold/30 bg-field-dark p-5 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-field-cream">Confirm batch assign</h3>
            <p className="text-sm text-field-cream/65 leading-relaxed">
              Assign{" "}
              <span className="font-semibold text-field-cream">
                {assignableLeads.length}
              </span>{" "}
              active lead{assignableLeads.length === 1 ? "" : "s"} to{" "}
              <span className="font-semibold text-field-gold">{targetLabel}</span>
              ?
            </p>
            <p className="text-xs text-field-cream/45">
              Filter: {filterSummary}. Closed leads in view are skipped. Each
              change is logged in revision history.
            </p>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
                className="min-h-[44px] px-4 text-sm text-field-cream/60 hover:text-field-cream disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="min-h-[44px] rounded-lg bg-field-gold px-5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 disabled:opacity-50"
              >
                {loading ? "Assigning…" : "Assign all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}