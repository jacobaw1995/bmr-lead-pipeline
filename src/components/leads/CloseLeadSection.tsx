"use client";

import { useState } from "react";
import { closeLeadLost, closeLeadWon } from "@/lib/leads/actions";

interface CloseLeadSectionProps {
  leadId: string;
  onClosed: () => void;
}

export function CloseLeadSection({ leadId, onClosed }: CloseLeadSectionProps) {
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"won" | "lost" | null>(null);

  async function handleCloseWon() {
    setError(null);
    setLoading("won");

    const result = await closeLeadWon(leadId);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    onClosed();
  }

  async function handleCloseLost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("lost");

    const result = await closeLeadLost(leadId, lostReason);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    onClosed();
  }

  return (
    <section className="rounded-lg border border-field-line/20 bg-field-turf/10 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
        Close Lead
      </h3>
      <p className="text-xs text-field-cream/50 mb-3">
        Available from any stage. Won deals move to Winner&apos;s Circle; lost
        deals move to the Lost Zone permanently.
      </p>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {!showLostForm ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleCloseWon}
            disabled={loading !== null}
            className="flex-1 rounded-lg bg-field-gold px-4 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
          >
            {loading === "won" ? "Closing…" : "🏆 Mark Closed-Won"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLostForm(true);
              setError(null);
            }}
            disabled={loading !== null}
            className="flex-1 rounded-lg border border-field-sage/40 bg-field-sage/10 px-4 py-2.5 text-sm font-medium text-field-cream/80 hover:bg-field-sage/20 transition disabled:opacity-50"
          >
            Mark Closed-Lost
          </button>
        </div>
      ) : (
        <form onSubmit={handleCloseLost} className="space-y-3">
          <div>
            <label
              htmlFor="lost-reason"
              className="block text-xs font-medium text-field-cream/70 mb-1"
            >
              What can we learn from this? <span className="text-field-gold">*</span>
            </label>
            <textarea
              id="lost-reason"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              required
              rows={3}
              placeholder="Price too high, went with competitor, timing wasn't right…"
              className="w-full rounded-lg border border-field-sage/30 bg-field-sage/5 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-sage/40 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowLostForm(false);
                setLostReason("");
                setError(null);
              }}
              className="flex-1 rounded-lg border border-field-line/30 px-4 py-2 text-sm text-field-cream/70 hover:bg-field-turf/20 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading !== null || !lostReason.trim()}
              className="flex-1 rounded-lg bg-field-sage/30 border border-field-sage/40 px-4 py-2 text-sm font-medium text-field-cream hover:bg-field-sage/40 transition disabled:opacity-50"
            >
              {loading === "lost" ? "Saving…" : "Confirm Lost"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}