"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLead } from "@/lib/leads/actions";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import type { LeadWithOwner } from "@/lib/leads/types";

interface DeleteLeadButtonProps {
  lead: LeadWithOwner;
  onDeleted?: () => void;
}

export function DeleteLeadButton({ lead, onDeleted }: DeleteLeadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const name = formatLeadDisplayName(lead);
    const confirmed = window.confirm(
      `Permanently delete "${name}"? Notes, activity, and appointments for this lead will also be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);

    const result = await deleteLead(lead.id);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onDeleted?.();
    router.refresh();
  }

  return (
    <div className="pt-2 border-t border-field-line/15">
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleDelete}
        className="min-h-[48px] w-full rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
      >
        {loading ? "Deleting…" : "Delete lead permanently"}
      </button>
      <p className="text-[10px] text-field-cream/35 mt-1.5 text-center">
        Manager only
      </p>
    </div>
  );
}