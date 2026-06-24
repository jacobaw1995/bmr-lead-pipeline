"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadValue } from "@/lib/leads/actions";
import { formatCurrency } from "@/lib/leads/format";

interface LeadCardInlineValueProps {
  leadId: string;
  currentValue: number | null;
  canEdit: boolean;
}

export function LeadCardInlineValue({
  leadId,
  currentValue,
  canEdit,
}: LeadCardInlineValueProps) {
  const router = useRouter();
  const [input, setInput] = useState(
    currentValue != null ? String(currentValue) : ""
  );
  const [editing, setEditing] = useState(currentValue == null && canEdit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit && currentValue == null) return null;

  async function save() {
    setError(null);
    setLoading(true);

    const parsed =
      input.trim() === "" ? null : parseFloat(input.replace(/,/g, ""));

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setError("Invalid amount");
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
    router.refresh();
  }

  function stopDrag(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  if (!editing && currentValue != null) {
    return (
      <button
        type="button"
        onClick={(e) => {
          stopDrag(e);
          if (canEdit) {
            setInput(String(currentValue));
            setEditing(true);
          }
        }}
        onPointerDown={stopDrag}
        className={`text-field-gold/80 font-medium text-left ${
          canEdit ? "hover:text-field-gold" : ""
        }`}
      >
        {formatCurrency(currentValue)}
      </button>
    );
  }

  if (!canEdit) return null;

  return (
    <div onPointerDown={stopDrag} onClick={stopDrag}>
      <div className="flex items-center gap-1">
        <span className="text-field-cream/40 text-xs">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setEditing(currentValue == null);
              setInput(currentValue != null ? String(currentValue) : "");
            }
          }}
          onBlur={() => {
            if (input.trim() !== "" || currentValue != null) save();
            else setEditing(false);
          }}
          placeholder="Quote"
          disabled={loading}
          autoFocus
          className="w-full min-w-0 rounded border border-field-gold/30 bg-field-turf/20 px-1.5 py-0.5 text-xs text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-1 focus:ring-field-gold/50"
        />
      </div>
      {error && (
        <p className="text-[10px] text-red-400 mt-0.5 truncate">{error}</p>
      )}
    </div>
  );
}