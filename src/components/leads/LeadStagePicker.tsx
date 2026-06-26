"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { moveLeadStage } from "@/lib/leads/actions";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/leads/constants";
import type { LeadStage } from "@/types/database";

interface LeadStagePickerProps {
  leadId: string;
  currentStage: LeadStage;
  canEdit: boolean;
  isActive: boolean;
  onUpdated?: () => void;
}

export function LeadStagePicker({
  leadId,
  currentStage,
  canEdit,
  isActive,
  onUpdated,
}: LeadStagePickerProps) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage, leadId]);

  async function handleChange(next: LeadStage) {
    if (!canEdit || !isActive || next === stage) return;

    setError(null);
    setLoading(true);
    const previous = stage;
    setStage(next);

    const result = await moveLeadStage(leadId, next);

    if (!result.success) {
      setStage(previous);
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onUpdated?.();
    router.refresh();
  }

  if (!isActive) {
    return (
      <p className="text-xs text-field-cream/45">
        Was {STAGE_LABELS[currentStage]}
      </p>
    );
  }

  if (!canEdit) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
          Pipeline stage
        </p>
        <p className="text-xs text-field-cream/60">{STAGE_LABELS[currentStage]}</p>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={`lead-stage-${leadId}`}
        className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
      >
        Pipeline stage
      </label>
      <select
        id={`lead-stage-${leadId}`}
        value={stage}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value as LeadStage)}
        className="w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm font-medium text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40 disabled:opacity-50 cursor-pointer"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {loading && (
        <p className="text-[10px] text-field-cream/40 mt-1">Updating…</p>
      )}
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}