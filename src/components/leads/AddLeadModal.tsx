"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/lib/leads/actions";
import { LEAD_SOURCES } from "@/lib/leads/constants";
import type { LeadSource } from "@/types/database";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [source, setSource] = useState<LeadSource>("manual");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setEmail("");
      setStreetAddress("");
      setCity("");
      setState("");
      setZip("");
      setSource("manual");
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
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
      name,
      phone,
      email,
      streetAddress,
      city,
      state,
      zip,
      source,
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

      <div className="relative w-full max-w-md rounded-xl border border-field-line/30 bg-field-dark shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-field-line/20">
          <h2 className="text-lg font-semibold text-field-cream">Add a Lead</h2>
          <p className="text-xs text-field-cream/50 mt-0.5">
            Lands in the Lead Box at Lead Captured
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <Field label="Name" required>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="John Smith"
            />
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="john@example.com"
            />
          </Field>

          <Field label="Street address">
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className={inputClass}
              placeholder="123 Main St"
            />
          </Field>

          <div className="grid grid-cols-6 gap-2">
            <Field label="City" className="col-span-3">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
                placeholder="Springfield"
              />
            </Field>
            <Field label="State" className="col-span-1">
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                className={inputClass}
                placeholder="TN"
                maxLength={2}
              />
            </Field>
            <Field label="ZIP" className="col-span-2">
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
                placeholder="37064"
                maxLength={10}
              />
            </Field>
          </div>

          <Field label="Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className={inputClass}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-3 pt-2">
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
      <label className="block text-xs font-medium text-field-cream/70 mb-1">
        {label}
        {required && <span className="text-field-gold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40";