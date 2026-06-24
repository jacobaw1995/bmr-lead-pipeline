"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeadDetails } from "@/lib/leads/actions";
import { sourceToPickerValues } from "@/lib/leads/sources";
import type { LeadWithOwner } from "@/lib/leads/types";
import { LeadSourcePicker } from "./LeadSourcePicker";

const inputClass =
  "w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40";

interface LeadEditDetailsProps {
  lead: LeadWithOwner;
  onUpdated?: () => void;
}

export function LeadEditDetails({ lead, onUpdated }: LeadEditDetailsProps) {
  const router = useRouter();
  const initialSource = sourceToPickerValues(lead.source);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [streetAddress, setStreetAddress] = useState(lead.street_address ?? "");
  const [city, setCity] = useState(lead.city ?? "");
  const [state, setState] = useState(lead.state ?? "");
  const [zip, setZip] = useState(lead.zip ?? "");
  const [sourcePicked, setSourcePicked] = useState(initialSource.picked);
  const [customSource, setCustomSource] = useState(initialSource.customSource);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    const source = sourceToPickerValues(lead.source);
    setName(lead.name);
    setPhone(lead.phone ?? "");
    setEmail(lead.email ?? "");
    setStreetAddress(lead.street_address ?? "");
    setCity(lead.city ?? "");
    setState(lead.state ?? "");
    setZip(lead.zip ?? "");
    setSourcePicked(source.picked);
    setCustomSource(source.customSource);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await updateLeadDetails(lead.id, {
      name,
      phone,
      email,
      streetAddress,
      city,
      state,
      zip,
      sourcePicked,
      customSource,
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
        Edit contact →
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-field-line/20 bg-field-dark/30 p-3 space-y-3"
    >
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Field label="Name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Street">
        <input
          type="text"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-6 gap-2">
        <Field label="City" className="col-span-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ST" className="col-span-1">
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className={inputClass}
          />
        </Field>
        <Field label="ZIP" className="col-span-2">
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            maxLength={10}
            className={inputClass}
          />
        </Field>
      </div>

      <LeadSourcePicker
        picked={sourcePicked}
        customSource={customSource}
        onPickedChange={setSourcePicked}
        onCustomChange={setCustomSource}
        groupName="lead-source-edit"
      />

      <div className="flex gap-2 pt-1">
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

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-field-cream/55 mb-1">
        {label}
        {required && <span className="text-field-gold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}