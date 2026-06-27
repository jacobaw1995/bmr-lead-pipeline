"use client";

import { useState } from "react";
import { PIPELINE_STAGES } from "@/lib/leads/constants";
import {
  addressFieldsEqual,
  copyAddressFields,
  type AddressFields,
  type LeadProfileInput,
} from "@/lib/leads/profile";
import { LeadSourcePicker } from "./LeadSourcePicker";
import { RoofTypeMultiSelect } from "./RoofTypeMultiSelect";

const inputClass =
  "w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40";

interface LeadProfileFormProps {
  value: LeadProfileInput;
  onChange: (next: LeadProfileInput) => void;
  sourcePicked: string;
  customSource: string;
  referralWho: string;
  onSourcePickedChange: (value: string) => void;
  onCustomSourceChange: (value: string) => void;
  onReferralWhoChange: (value: string) => void;
  showStage?: boolean;
  compact?: boolean;
}

export function LeadProfileForm({
  value,
  onChange,
  sourcePicked,
  customSource,
  referralWho,
  onSourcePickedChange,
  onCustomSourceChange,
  onReferralWhoChange,
  showStage = false,
  compact = false,
}: LeadProfileFormProps) {
  const [serviceSameAsBilling, setServiceSameAsBilling] = useState(() =>
    addressFieldsEqual(value.billing, value.service)
  );

  function patch(partial: Partial<LeadProfileInput>) {
    onChange({ ...value, ...partial });
  }

  function patchBilling(partial: Partial<AddressFields>) {
    const nextBilling = { ...value.billing, ...partial };
    const next: LeadProfileInput = { ...value, billing: nextBilling };
    if (serviceSameAsBilling) {
      next.service = copyAddressFields(nextBilling);
    }
    onChange(next);
  }

  function patchService(partial: Partial<AddressFields>) {
    if (serviceSameAsBilling) return;
    onChange({ ...value, service: { ...value.service, ...partial } });
  }

  function handleServiceSameAsBilling(checked: boolean) {
    setServiceSameAsBilling(checked);
    if (checked) {
      onChange({
        ...value,
        service: copyAddressFields(value.billing),
      });
    }
  }

  const sectionClass = compact
    ? "space-y-2"
    : "rounded-lg border border-field-line/15 bg-field-dark/20 p-3 space-y-3";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <section className={sectionClass}>
        {!compact && (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/80">
            Contact
          </h4>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name">
            <input
              type="text"
              value={value.firstName ?? ""}
              onChange={(e) => patch({ firstName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={value.lastName ?? ""}
              onChange={(e) => patch({ lastName: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Company">
          <input
            type="text"
            value={value.companyName ?? ""}
            onChange={(e) => patch({ companyName: e.target.value })}
            className={inputClass}
            placeholder="Optional — contractors, businesses"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cell phone">
            <input
              type="tel"
              value={value.cellPhone ?? ""}
              onChange={(e) => patch({ cellPhone: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Secondary #">
            <input
              type="tel"
              value={value.secondaryPhone ?? ""}
              onChange={(e) => patch({ secondaryPhone: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Email">
          <input
            type="email"
            value={value.email ?? ""}
            onChange={(e) => patch({ email: e.target.value })}
            className={inputClass}
          />
        </Field>
      </section>

      <section className={sectionClass}>
        {!compact ? (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/80">
            Billing address
          </h4>
        ) : (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/70">
            Billing address
          </p>
        )}
        <Field label="Street">
          <input
            type="text"
            value={value.billing?.streetAddress ?? ""}
            onChange={(e) => patchBilling({ streetAddress: e.target.value })}
            className={inputClass}
          />
        </Field>
        <AddressCityStateZip
          city={value.billing?.city ?? ""}
          state={value.billing?.state ?? ""}
          zip={value.billing?.zip ?? ""}
          onCity={(v) => patchBilling({ city: v })}
          onState={(v) => patchBilling({ state: v })}
          onZip={(v) => patchBilling({ zip: v })}
        />
      </section>

      <section className={sectionClass}>
        {!compact ? (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/80">
            Service address (job site)
          </h4>
        ) : (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/70">
            Service address
          </p>
        )}
        <AddressSameToggle
          checked={serviceSameAsBilling}
          onChange={handleServiceSameAsBilling}
          label="Same as billing address"
        />
        <Field label="Street">
          <input
            type="text"
            value={value.service?.streetAddress ?? ""}
            onChange={(e) => patchService({ streetAddress: e.target.value })}
            disabled={serviceSameAsBilling}
            className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </Field>
        <AddressCityStateZip
          city={value.service?.city ?? ""}
          state={value.service?.state ?? ""}
          zip={value.service?.zip ?? ""}
          disabled={serviceSameAsBilling}
          onCity={(v) => patchService({ city: v })}
          onState={(v) => patchService({ state: v })}
          onZip={(v) => patchService({ zip: v })}
        />
      </section>

      <section className={sectionClass}>
        {!compact && (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-field-gold/80">
            Project
          </h4>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Existing roof type(s)">
            <RoofTypeMultiSelect
              value={value.existingRoofType}
              onChange={(serialized) =>
                patch({ existingRoofType: serialized ?? "" })
              }
            />
          </Field>
          <Field label="Requested roof type(s)">
            <RoofTypeMultiSelect
              value={value.roofTypeRequested}
              onChange={(serialized) =>
                patch({ roofTypeRequested: serialized ?? "" })
              }
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Remodel / new">
            <select
              value={value.remodelOrNewConstruction ?? ""}
              onChange={(e) =>
                patch({ remodelOrNewConstruction: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Select…</option>
              <option value="Remodel">Remodel</option>
              <option value="New Construction">New Construction</option>
            </select>
          </Field>
          <Field label="Customer type">
            <select
              value={value.homeownerOrContractor ?? ""}
              onChange={(e) =>
                patch({ homeownerOrContractor: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Select…</option>
              <option value="Homeowner">Homeowner</option>
              <option value="Contractor">Contractor</option>
            </select>
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <LeadSourcePicker
          picked={sourcePicked}
          customSource={customSource}
          referralWho={referralWho}
          onPickedChange={onSourcePickedChange}
          onCustomChange={onCustomSourceChange}
          onReferralWhoChange={onReferralWhoChange}
          groupName={compact ? "lead-source-edit" : "lead-source-add"}
        />
        {showStage && (
          <Field label="Stage">
            <select
              value={value.stage ?? "lead_captured"}
              onChange={(e) =>
                patch({ stage: e.target.value as LeadProfileInput["stage"] })
              }
              className={inputClass}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </section>
    </div>
  );
}

function AddressSameToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-field-cream/60 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-field-gold shrink-0"
      />
      {label}
    </label>
  );
}

function AddressCityStateZip({
  city,
  state,
  zip,
  disabled = false,
  onCity,
  onState,
  onZip,
}: {
  city: string;
  state: string;
  zip: string;
  disabled?: boolean;
  onCity: (v: string) => void;
  onState: (v: string) => void;
  onZip: (v: string) => void;
}) {
  const fieldClass = `${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="grid grid-cols-6 gap-2">
      <Field label="City" className="col-span-3">
        <input
          type="text"
          value={city}
          onChange={(e) => onCity(e.target.value)}
          disabled={disabled}
          className={fieldClass}
        />
      </Field>
      <Field label="ST" className="col-span-1">
        <input
          type="text"
          value={state}
          onChange={(e) => onState(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          disabled={disabled}
          className={fieldClass}
        />
      </Field>
      <Field label="ZIP" className="col-span-2">
        <input
          type="text"
          value={zip}
          onChange={(e) => onZip(e.target.value)}
          maxLength={10}
          disabled={disabled}
          className={fieldClass}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-field-cream/55 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}