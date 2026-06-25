"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchLeadFields, updateIntakeChecklist } from "@/lib/leads/actions";
import { mapsDirectionsUrl } from "@/lib/leads/address";
import {
  getVitalFieldDefs,
  type CommandStageKey,
  type VitalFieldDef,
} from "@/lib/leads/command-center";
import {
  parseIntakeChecklist,
  type IntakeChecklistData,
} from "@/lib/leads/intake-checklist";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";
import { RoofTypeMultiSelect } from "./RoofTypeMultiSelect";

const inputClass =
  "w-full rounded-lg border border-field-line/30 bg-field-dark/40 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 min-h-[48px]";

const CUSTOMER_TYPES = ["Homeowner", "Contractor"];
const PROJECT_TYPES = ["Remodel", "New Construction"];

interface LeadVitalFieldsProps {
  view: CommandStageKey;
  lead: LeadWithOwner;
  notes: NoteWithAuthor[];
  canEdit: boolean;
  onUpdated: () => void;
  onToast: (message: string) => void;
}

export function LeadVitalFields({
  view,
  lead,
  notes,
  canEdit,
  onUpdated,
  onToast,
}: LeadVitalFieldsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const fields = getVitalFieldDefs(
    view,
    lead,
    lead.appointments,
    checklist,
    notes
  );

  async function saveField(def: VitalFieldDef, rawValue: string | null) {
    if (!canEdit || !def.patchKey) return;
    setSaving(def.key);
    setError(null);

    let result: { success: boolean; error?: string } = { success: false };

    if (def.patchKey === "mainIssue") {
      const next: IntakeChecklistData = {
        ...checklist,
        main_issue: rawValue ?? "",
      };
      const r = await updateIntakeChecklist(lead.id, next);
      result = r;
      if (r.success && r.scopeBuilt) onToast("Scope auto-built from site data");
    } else {
      result = await patchLeadFields(lead.id, {
        [def.patchKey]: rawValue ?? "",
      });
    }

    if (!result.success) {
      setError(result.error ?? "Could not save.");
      setSaving(null);
      return;
    }

    setSaving(null);
    onUpdated();
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {error && (
        <div className="col-span-full rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {fields.map((field) => (
        <VitalFieldCard
          key={`${field.key}-${field.rawValue ?? field.value ?? ""}`}
          field={field}
          canEdit={canEdit && !!field.patchKey}
          saving={saving === field.key}
          onSave={(value) => saveField(field, value)}
        />
      ))}
    </div>
  );
}

function VitalFieldCard({
  field,
  canEdit,
  saving,
  onSave,
}: {
  field: VitalFieldDef;
  canEdit: boolean;
  saving: boolean;
  onSave: (value: string | null) => void;
}) {
  const initial =
    field.type === "address"
      ? field.rawValue ?? field.value?.split(",")[0]?.trim() ?? ""
      : field.value ?? "";
  const [draft, setDraft] = useState(initial);

  if (field.type === "readonly" || !canEdit) {
    return (
      <div className="rounded-xl border border-field-line/20 bg-field-turf/10 px-4 py-3 min-h-[72px]">
        <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
          {field.label}
        </p>
        {field.value ? (
          field.href ? (
            <a
              href={field.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-field-cream leading-snug hover:text-field-gold transition"
            >
              {field.value}
            </a>
          ) : (
            <p className="text-sm font-medium text-field-cream leading-snug">
              {field.value}
            </p>
          )
        ) : (
          <p className="text-sm text-field-cream/35 italic">
            {field.emptyHint ?? "—"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-field-gold/20 bg-field-turf/10 px-4 py-3">
      <label
        htmlFor={`vital-${field.key}`}
        className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
      >
        {field.label}
      </label>

      {field.type === "roof_types" && (
        <RoofTypeMultiSelect
          id={`vital-${field.key}`}
          value={field.rawValue}
          disabled={saving}
          onChange={(serialized) => onSave(serialized)}
        />
      )}

      {field.type === "select" && field.options && (
        <select
          id={`vital-${field.key}`}
          value={draft}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            onSave(e.target.value || null);
          }}
          className={inputClass}
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "textarea" && (
        <textarea
          id={`vital-${field.key}`}
          value={draft}
          disabled={saving}
          rows={3}
          placeholder={field.emptyHint}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== (field.value ?? "")) onSave(draft || null);
          }}
          className={`${inputClass} resize-none`}
        />
      )}

      {(field.type === "text" || field.type === "phone" || field.type === "email") && (
        <input
          id={`vital-${field.key}`}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={draft}
          disabled={saving}
          placeholder={field.emptyHint}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== (field.value ?? "")) onSave(draft || null);
          }}
          className={inputClass}
        />
      )}

      {field.type === "address" && (
        <div className="space-y-2">
          <input
            type="text"
            value={draft}
            disabled={saving}
            placeholder="Street address"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== (field.value ?? "")) onSave(draft || null);
            }}
            className={inputClass}
          />
          {field.value && (
            <a
              href={mapsDirectionsUrl(field.value)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-field-gold hover:text-field-cream"
            >
              Directions →
            </a>
          )}
        </div>
      )}

      {saving && (
        <p className="text-[10px] text-field-cream/40 mt-1">Saving…</p>
      )}
    </div>
  );
}

export { CUSTOMER_TYPES, PROJECT_TYPES };