"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateIntakeChecklist } from "@/lib/leads/actions";
import {
  SITE_VISIT_SCOPE_ITEMS,
  getIntakeChecklistStatus,
  getIntakeProgress,
  getSiteVisitScopeProgress,
  getSiteVisitScopeStatus,
  parseIntakeChecklist,
  type IntakeChecklistData,
} from "@/lib/leads/intake-checklist";
import type { LeadWithOwner } from "@/lib/leads/types";

interface LeadIntakeChecklistProps {
  lead: LeadWithOwner;
  canEdit: boolean;
  variant: "intake" | "site_visit";
  onUpdated: () => void;
  onToast: (message: string) => void;
}

export function LeadIntakeChecklist({
  lead,
  canEdit,
  variant,
  onUpdated,
  onToast,
}: LeadIntakeChecklistProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const checklist = parseIntakeChecklist(lead.intake_checklist);

  async function persist(next: IntakeChecklistData) {
    if (!canEdit) return;
    setSaving(true);
    const result = await updateIntakeChecklist(lead.id, next);
    setSaving(false);

    if (!result.success) return;

    if (result.scopeBuilt) {
      onToast("Scope auto-built — all site data gathered");
    }
    onUpdated();
    router.refresh();
  }

  if (variant === "intake") {
    const items = getIntakeChecklistStatus(
      lead,
      checklist,
      lead.appointments
    );
    const progress = getIntakeProgress(lead, checklist, lead.appointments);

    return (
      <section className="rounded-xl border border-field-gold/25 bg-field-gold/5 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
            Intake call checklist
          </h3>
          <span className="text-xs font-mono text-field-cream/50">
            {progress.done}/{progress.total}
          </span>
        </div>
        <p className="text-xs text-field-cream/50 mb-4 leading-relaxed">
          Call the prospect and gather each item below. Schedule the site visit
          before you hang up.
        </p>
        <div className="h-1.5 rounded-full bg-field-dark/40 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-field-gold transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 min-h-[48px] ${
                item.complete
                  ? "bg-field-sage/10 border border-field-sage/25"
                  : "bg-field-dark/30 border border-field-line/15"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  item.complete
                    ? "bg-field-sage text-field-dark"
                    : "border border-field-line/30 text-field-cream/30"
                }`}
                aria-hidden
              >
                {item.complete ? "✓" : ""}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm ${
                    item.complete ? "text-field-cream" : "text-field-cream/75"
                  }`}
                >
                  {item.label}
                </p>
                {item.hint && (
                  <p className="text-[10px] text-field-cream/40 mt-0.5">
                    {item.hint}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {saving && (
          <p className="text-[10px] text-field-cream/40 mt-3 text-center">
            Saving…
          </p>
        )}
      </section>
    );
  }

  const items = getSiteVisitScopeStatus(checklist);
  const progress = getSiteVisitScopeProgress(checklist);
  const site = checklist.site_visit ?? {};

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-turf/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
          Site visit scope data
        </h3>
        <span className="text-xs font-mono text-field-cream/50">
          {progress.done}/{progress.total}
        </span>
      </div>
      <p className="text-xs text-field-cream/50 mb-4 leading-relaxed">
        Capture measurements and materials on site. When complete, the system
        builds the scope automatically — proposal generation comes next.
      </p>
      <div className="h-1.5 rounded-full bg-field-dark/40 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-field-turf to-field-gold transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SITE_VISIT_SCOPE_ITEMS.map((def) => {
          const val = site[def.key];
          return (
            <div key={def.key} className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-field-cream/40">
                {def.label}
                {def.unit ? ` (${def.unit})` : ""}
              </label>
              {def.inputType === "boolean" ? (
                <label className="flex items-center gap-2 min-h-[48px] rounded-lg border border-field-line/20 bg-field-dark/30 px-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val === true}
                    disabled={!canEdit || saving}
                    onChange={(e) => {
                      const next: IntakeChecklistData = {
                        ...checklist,
                        site_visit: {
                          ...site,
                          [def.key]: e.target.checked,
                        },
                      };
                      persist(next);
                    }}
                    className="rounded border-field-line/40 text-field-gold"
                  />
                  <span className="text-sm text-field-cream">
                    {val === true ? "Yes" : val === false ? "No" : "Not set"}
                  </span>
                </label>
              ) : def.inputType === "number" ? (
                <ScopeNumberInput
                  value={typeof val === "number" ? val : null}
                  disabled={!canEdit || saving}
                  onCommit={(num) => {
                    const next: IntakeChecklistData = {
                      ...checklist,
                      site_visit: { ...site, [def.key]: num },
                    };
                    void persist(next);
                  }}
                />
              ) : (
                <ScopeTextInput
                  value={typeof val === "string" ? val : ""}
                  disabled={!canEdit || saving}
                  placeholder={def.hint ?? ""}
                  onCommit={(text) => {
                    const next: IntakeChecklistData = {
                      ...checklist,
                      site_visit: { ...site, [def.key]: text },
                    };
                    void persist(next);
                  }}
                />
              )}
              {def.hint && def.inputType !== "text" && (
                <p className="text-[10px] text-field-cream/35">{def.hint}</p>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1">
        {items
          .filter((i) => i.complete)
          .slice(0, 4)
          .map((i) => (
            <li key={i.key} className="text-[10px] text-field-sage">
              ✓ {i.label}
            </li>
          ))}
      </ul>
    </section>
  );
}

function ScopeNumberInput({
  value,
  disabled,
  onCommit,
}: {
  value: number | null;
  disabled: boolean;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");

  useEffect(() => {
    setDraft(value != null ? String(value) : "");
  }, [value]);

  return (
    <input
      type="number"
      min={0}
      disabled={disabled}
      value={draft}
      placeholder="0"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = draft === "" ? 0 : Number(draft);
        if (!isNaN(num) && num !== value) onCommit(num);
      }}
      className="w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-dark/40 px-3 text-sm text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40"
    />
  );
}

function ScopeTextInput({
  value,
  disabled,
  placeholder,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      type="text"
      disabled={disabled}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      className="w-full min-h-[48px] rounded-lg border border-field-line/30 bg-field-dark/40 px-3 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
    />
  );
}