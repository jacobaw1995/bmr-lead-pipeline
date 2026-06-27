"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAssignableReps, reassignLead } from "@/lib/leads/actions";
import type { LeadWithOwner } from "@/lib/leads/types";

interface LeadOwnerReassignProps {
  lead: LeadWithOwner;
  onReassigned?: () => void;
}

export function LeadOwnerReassign({ lead, onReassigned }: LeadOwnerReassignProps) {
  const router = useRouter();
  const [reps, setReps] = useState<{ id: string; full_name: string }[]>([]);
  const [value, setValue] = useState(lead.owner_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(lead.owner_id ?? "");
  }, [lead.owner_id]);

  useEffect(() => {
    fetchAssignableReps().then((result) => {
      if (result.success) {
        setReps(result.reps);
      }
    });
  }, []);

  async function handleChange(newOwnerId: string) {
    setValue(newOwnerId);
    setError(null);
    setLoading(true);

    const ownerId = newOwnerId === "" ? null : newOwnerId;
    const result = await reassignLead(lead.id, ownerId);

    if (!result.success) {
      setError(result.error);
      setValue(lead.owner_id ?? "");
      setLoading(false);
      return;
    }

    setLoading(false);
    onReassigned?.();
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <select
        id={`owner-${lead.id}`}
        value={value}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Lead owner"
        className="w-full text-sm rounded-lg border border-field-line/25 bg-field-turf/10 text-field-cream/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-field-gold/40 disabled:opacity-50"
      >
        <option value="">Unclaimed</option>
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.full_name}
          </option>
        ))}
      </select>
      {loading && (
        <span className="text-[10px] text-field-cream/35">Saving…</span>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}