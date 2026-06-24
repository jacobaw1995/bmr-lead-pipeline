"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleMilestone } from "@/lib/leads/actions";
import { MILESTONES, getMilestoneProgress } from "@/lib/leads/milestones";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { MilestoneKey } from "@/lib/leads/milestones";

interface LeadMilestonesProps {
  lead: LeadWithOwner;
  canEdit: boolean;
}

export function LeadMilestones({ lead, canEdit }: LeadMilestonesProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<MilestoneKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = getMilestoneProgress(lead);

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

  return (
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

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MILESTONES.map((milestone, index) => {
            const done = lead[milestone.field] != null;
            const isLoading = loading === milestone.key;

            return (
              <button
                key={milestone.key}
                type="button"
                disabled={!canEdit || isLoading}
                onClick={() => handleToggle(milestone.key, done)}
                className={`relative rounded-lg border p-3 text-left transition-all ${
                  done
                    ? "border-field-gold/50 bg-field-gold/15 shadow-sm shadow-field-gold/10"
                    : "border-field-line/20 bg-field-dark/30 hover:border-field-line/35"
                } ${canEdit ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-90"}`}
              >
                <span
                  className={`absolute top-2 right-2 text-[10px] font-mono ${
                    done ? "text-field-gold" : "text-field-cream/25"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xl block mb-1.5" aria-hidden>
                  {milestone.icon}
                </span>
                <span
                  className={`text-[11px] font-semibold leading-tight block ${
                    done ? "text-field-cream" : "text-field-cream/55"
                  }`}
                >
                  {milestone.shortLabel}
                </span>
                <span className="text-[10px] text-field-cream/40 mt-0.5 block leading-snug">
                  {done ? "Done" : "Tap to mark"}
                </span>
                {isLoading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-field-dark/40 rounded-lg text-xs text-field-cream">
                    …
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!canEdit && (
          <p className="text-[10px] text-field-cream/35 mt-3 text-center">
            Claim or own this lead to update milestones
          </p>
        )}
      </div>
    </section>
  );
}