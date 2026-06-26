"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  undoImportBatch,
  wipeOrphanCsvImports,
} from "@/lib/leads/actions";
import { formatTimestamp } from "@/lib/leads/format";
import type { ImportBatchSummary } from "@/lib/leads/imports";

interface ImportHistoryProps {
  batches: ImportBatchSummary[];
  orphanCount: number;
}

export function ImportHistory({ batches, orphanCount }: ImportHistoryProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [wipingOrphans, setWipingOrphans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUndo(batch: ImportBatchSummary) {
    if (batch.status === "undone") return;

    const count = batch.remainingLeads;
    const label = batch.filename ?? "this import";
    const confirmed = window.confirm(
      count > 0
        ? `Delete ${count} lead${count === 1 ? "" : "s"} from "${label}"? This cannot be undone.`
        : `Mark "${label}" as undone? No leads remain from this batch.`
    );

    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setLoadingId(batch.id);

    const result = await undoImportBatch(batch.id);

    setLoadingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessage(
      result.deletedCount > 0
        ? `Removed ${result.deletedCount} lead${result.deletedCount === 1 ? "" : "s"} from the pipeline.`
        : "Import marked as undone."
    );
    router.refresh();
  }

  async function handleWipeOrphans() {
    const confirmed = window.confirm(
      `Delete ${orphanCount} legacy CSV import lead${orphanCount === 1 ? "" : "s"} (imports before batch tracking)? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setWipingOrphans(true);

    const result = await wipeOrphanCsvImports();

    setWipingOrphans(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessage(
      `Removed ${result.deletedCount} legacy import lead${result.deletedCount === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-dark/40 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-1">
        Import history
      </h2>
      <p className="text-xs text-field-cream/45 mb-4 leading-relaxed">
        Undo a bad import in one step — all leads from that batch are permanently
        removed from the pipeline.
      </p>

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-300 mb-3">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-field-sage/10 border border-field-sage/30 px-3 py-2 text-sm text-field-cream mb-3">
          {message}
        </div>
      )}

      {orphanCount > 0 && (
        <div className="rounded-lg border border-field-gold/25 bg-field-gold/5 p-4 mb-4">
          <p className="text-sm text-field-cream mb-1">
            <span className="font-semibold text-field-gold">{orphanCount}</span>{" "}
            legacy CSV import{orphanCount === 1 ? "" : "s"} found
          </p>
          <p className="text-xs text-field-cream/50 mb-3 leading-relaxed">
            These leads were imported before batch tracking existed. Wipe them all
            if a spreadsheet import went wrong.
          </p>
          <button
            type="button"
            disabled={wipingOrphans}
            onClick={handleWipeOrphans}
            className="min-h-[48px] rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/50 transition disabled:opacity-50"
          >
            {wipingOrphans ? "Removing…" : `Wipe ${orphanCount} legacy import leads`}
          </button>
        </div>
      )}

      {batches.length === 0 && orphanCount === 0 && (
        <p className="text-sm text-field-cream/40">
          No imports yet. Each upload is tracked here so you can undo a bad
          spreadsheet in one click.
        </p>
      )}

      {batches.length > 0 && (
        <ul className="space-y-2">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="rounded-lg border border-field-line/20 bg-field-turf/10 px-4 py-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-field-cream truncate">
                    {batch.filename ?? "Spreadsheet import"}
                  </p>
                  <p className="text-xs text-field-cream/45 mt-0.5">
                    {formatTimestamp(batch.createdAt)} · {batch.importerName}
                  </p>
                  <p className="text-xs text-field-cream/55 mt-1">
                    Imported {batch.importedCount}
                    {batch.skippedCount > 0 && ` · ${batch.skippedCount} skipped`}
                    {batch.status === "active" && batch.remainingLeads > 0 && (
                      <span className="text-field-gold">
                        {" "}
                        · {batch.remainingLeads} still in pipeline
                      </span>
                    )}
                    {batch.status === "undone" && (
                      <span className="text-field-sage"> · Undone</span>
                    )}
                  </p>
                </div>
                {batch.status === "active" && batch.remainingLeads > 0 && (
                  <button
                    type="button"
                    disabled={loadingId === batch.id}
                    onClick={() => handleUndo(batch)}
                    className="shrink-0 min-h-[48px] rounded-lg border border-red-800/40 bg-red-950/25 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/45 transition disabled:opacity-50"
                  >
                    {loadingId === batch.id ? "Removing…" : "Undo import"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}