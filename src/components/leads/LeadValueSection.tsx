"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadValue } from "@/lib/leads/actions";
import { formatCurrency } from "@/lib/leads/format";

interface LeadValueSectionProps {
  leadId: string;
  currentValue: number | null;
  onUpdated?: () => void;
}

export function LeadValueSection({
  leadId,
  currentValue,
  onUpdated,
}: LeadValueSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(currentValue == null);
  const [input, setInput] = useState(
    currentValue != null ? String(currentValue) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsed = input.trim() === "" ? null : parseFloat(input.replace(/,/g, ""));

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setError("Enter a valid dollar amount.");
      setLoading(false);
      return;
    }

    const result = await setLeadValue(leadId, parsed);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);
    onUpdated?.();
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-field-gold/25 bg-field-gold/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-1">
        Quote / Deal Value
      </h3>
      <p className="text-xs text-field-cream/45 mb-3">
        Set once you&apos;ve priced the job — feeds your pipeline scoreboard.
      </p>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {!editing && currentValue != null ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-bold text-field-gold">
            {formatCurrency(currentValue)}
          </p>
          <button
            type="button"
            onClick={() => {
              setInput(String(currentValue));
              setEditing(true);
            }}
            className="text-sm text-field-cream/60 hover:text-field-cream transition"
          >
            Edit
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-field-cream/40 text-sm">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="12,500"
              className="w-full rounded-lg border border-field-line/30 bg-field-turf/10 pl-7 pr-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50 shrink-0"
          >
            {loading ? "…" : "Save"}
          </button>
          {currentValue != null && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-field-cream/50 hover:text-field-cream px-2"
            >
              Cancel
            </button>
          )}
        </form>
      )}
    </section>
  );
}