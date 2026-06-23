"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimLead } from "@/lib/leads/actions";

interface ClaimLeadButtonProps {
  leadId: string;
  onClaimed?: () => void;
}

export function ClaimLeadButton({ leadId, onClaimed }: ClaimLeadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setError(null);
    setLoading(true);

    const result = await claimLead(leadId);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClaimed?.();
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-field-gold/30 bg-field-gold/10 p-4">
      <p className="text-sm text-field-cream/80 mb-3">
        This lead is unclaimed. Take ownership to move it through the pipeline.
      </p>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className="w-full rounded-lg bg-field-gold px-4 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
      >
        {loading ? "Claiming…" : "Claim This Lead"}
      </button>
    </div>
  );
}