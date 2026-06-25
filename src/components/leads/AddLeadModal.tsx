"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/lib/leads/actions";
import type { LeadProfileInput } from "@/lib/leads/profile";
import { LeadProfileForm } from "./LeadProfileForm";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyProfile: LeadProfileInput = {
  firstName: "",
  lastName: "",
  companyName: "",
  billing: {},
  service: {},
  cellPhone: "",
  secondaryPhone: "",
  email: "",
};

export function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<LeadProfileInput>(emptyProfile);
  const [sourcePicked, setSourcePicked] = useState("Phone Call");
  const [customSource, setCustomSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open) {
      setProfile(emptyProfile);
      setSourcePicked("Phone Call");
      setCustomSource("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createLead({
      ...profile,
      sourcePicked,
      customSource,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-field-dark/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-xl border border-field-line/30 bg-field-dark shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-field-line/20 sticky top-0 bg-field-dark z-10">
          <h2 className="text-lg font-semibold text-field-cream">Add a Lead</h2>
          <p className="text-xs text-field-cream/50 mt-0.5">
            Lands in the Lead Box at Lead Captured
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <LeadProfileForm
            value={profile}
            onChange={setProfile}
            sourcePicked={sourcePicked}
            customSource={customSource}
            onSourcePickedChange={setSourcePicked}
            onCustomSourceChange={setCustomSource}
          />

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-field-dark pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-field-line/30 px-4 py-2.5 text-sm font-medium text-field-cream/70 hover:bg-field-turf/20 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-field-gold px-4 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
            >
              {loading ? "Adding…" : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}