"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { batchReassignLeads, fetchAssignableReps } from "@/lib/leads/actions";
import { getBatchAssignableIds } from "@/lib/leads/batch-edit";
import type { LeadSearchFilters } from "@/lib/leads/search";
import type { LeadWithOwner } from "@/lib/leads/types";

interface BatchEditToolbarProps {
  selectedIds: string[];
  filteredLeads: LeadWithOwner[];
  filters?: LeadSearchFilters;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onExit: () => void;
}

export function BatchEditToolbar({
  selectedIds,
  filteredLeads,
  onSelectAllFiltered,
  onClearSelection,
  onExit,
}: BatchEditToolbarProps) {
  const router = useRouter();
  const [reps, setReps] = useState<{ id: string; full_name: string }[]>([]);
  const [targetOwnerId, setTargetOwnerId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableFilteredCount = useMemo(
    () => getBatchAssignableIds(filteredLeads).length,
    [filteredLeads]
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

  async function handleConfirm() {
    if (selectedIds.length === 0) return;
    setError(null);
    setLoading(true);

    const ownerId = targetOwnerId === "" ? null : targetOwnerId;
    const response = await batchReassignLeads(selectedIds, ownerId);

    if (!response.success) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setConfirmOpen(false);
    onClearSelection();
    onExit();
    router.refresh();
  }

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-field-gold/30 bg-field-dark/95 backdrop-blur-md px-4 py-3 safe-area-bottom">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-field-cream shrink-0">
              {selectedIds.length} selected
            </span>
            {assignableFilteredCount > 0 && (
              <button
                type="button"
                onClick={onSelectAllFiltered}
                className="text-xs text-field-gold hover:text-field-cream transition truncate"
              >
                Select all filtered ({assignableFilteredCount})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-field-cream/45 hover:text-field-cream transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:justify-end sm:items-center">
            <select
              value={targetOwnerId}
              onChange={(e) => {
                setTargetOwnerId(e.target.value);
                setError(null);
              }}
              aria-label="Assign selected leads to"
              className="min-h-[40px] rounded-lg border border-field-line/25 bg-field-turf/10 text-field-cream text-sm px-3 py-2 sm:max-w-[200px]"
            >
              <option value="">Unclaimed (pool)</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => {
                  setError(null);
                  setConfirmOpen(true);
                }}
                className="flex-1 sm:flex-none min-h-[40px] rounded-lg bg-field-gold px-4 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-40"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={onExit}
                className="min-h-[40px] px-3 text-sm text-field-cream/55 hover:text-field-cream transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
        {error && !confirmOpen && (
          <p className="max-w-7xl mx-auto text-xs text-red-400 mt-2">{error}</p>
        )}
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
            <h3 className="text-lg font-bold text-field-cream">Assign selected leads</h3>
            <p className="text-sm text-field-cream/65 leading-relaxed">
              Assign{" "}
              <span className="font-semibold text-field-cream">
                {selectedIds.length}
              </span>{" "}
              lead{selectedIds.length === 1 ? "" : "s"} to{" "}
              <span className="font-semibold text-field-gold">{targetLabel}</span>?
            </p>
            <p className="text-xs text-field-cream/45">
              Only active leads are updated. Each change is logged in revision
              history.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
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
                {loading ? "Assigning…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}