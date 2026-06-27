"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeadDetails } from "@/lib/leads/actions";
import { leadToProfileInput } from "@/lib/leads/profile";
import type { LeadProfileInput } from "@/lib/leads/profile";
import { sourceToPickerValues } from "@/lib/leads/sources";
import type { LeadWithOwner } from "@/lib/leads/types";
import { useOptionalLeadPanelDraft } from "./LeadPanelDraftContext";
import { LeadProfileForm } from "./LeadProfileForm";

interface LeadEditDetailsProps {
  lead: LeadWithOwner;
  onUpdated?: () => void;
}

export function LeadEditDetails({ lead, onUpdated }: LeadEditDetailsProps) {
  const router = useRouter();
  const source = sourceToPickerValues(lead.source);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<LeadProfileInput>(() =>
    leadToProfileInput(lead, source)
  );
  const [sourcePicked, setSourcePicked] = useState(source.picked);
  const [customSource, setCustomSource] = useState(source.customSource);
  const [referralWho, setReferralWho] = useState(lead.referral_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelDraft = useOptionalLeadPanelDraft();

  const baseline = useMemo(
    () => ({
      profile: leadToProfileInput(lead, source),
      sourcePicked: source.picked,
      customSource: source.customSource,
      referralWho: lead.referral_name ?? "",
    }),
    [lead, source]
  );

  const isDirty = useMemo(() => {
    if (!open) return false;
    return (
      JSON.stringify({
        profile,
        sourcePicked,
        customSource,
        referralWho,
      }) !== JSON.stringify(baseline)
    );
  }, [
    open,
    profile,
    sourcePicked,
    customSource,
    referralWho,
    baseline,
  ]);

  useEffect(() => {
    if (!open || !panelDraft) return;
    return panelDraft.registerCloseGuard(() => {
      if (!isDirty) return true;
      return window.confirm("Discard unsaved lead detail edits?");
    });
  }, [open, isDirty, panelDraft]);

  function resetForm() {
    const nextSource = sourceToPickerValues(lead.source);
    setProfile(leadToProfileInput(lead, nextSource));
    setSourcePicked(nextSource.picked);
    setCustomSource(nextSource.customSource);
    setReferralWho(lead.referral_name ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await updateLeadDetails(lead.id, {
      ...profile,
      sourcePicked,
      customSource,
      referralWho,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    onUpdated?.();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="text-xs font-medium text-field-gold hover:text-field-cream transition"
      >
        Edit lead details →
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-field-line/20 bg-field-dark/30 p-3 space-y-3 max-h-[60vh] overflow-y-auto"
    >
      {error && <p className="text-xs text-red-400">{error}</p>}

      <LeadProfileForm
        value={profile}
        onChange={setProfile}
        sourcePicked={sourcePicked}
        customSource={customSource}
        onSourcePickedChange={setSourcePicked}
        onCustomSourceChange={setCustomSource}
        referralWho={referralWho}
        onReferralWhoChange={setReferralWho}
        showStage
        compact
      />

      <div className="flex gap-2 pt-1 sticky bottom-0 bg-field-dark/30">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(false);
          }}
          className="flex-1 rounded-lg border border-field-line/30 px-3 py-2 text-xs font-medium text-field-cream/70 hover:bg-field-turf/20 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-field-gold px-3 py-2 text-xs font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}