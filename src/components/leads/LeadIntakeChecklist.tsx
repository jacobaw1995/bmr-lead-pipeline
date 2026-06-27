"use client";

import { useState, useEffect } from "react";
import { usePendingFieldSave } from "./usePendingFieldSave";
import { useRouter } from "next/navigation";
import { updateIntakeChecklist } from "@/lib/leads/actions";
import {
  SITE_VISIT_SCOPE_ITEMS,
  getIntakeChecklistStatus,
  getIntakeProgress,
  getSiteVisitScopeProgress,
  getSiteVisitScopeStatus,
  parseIntakeChecklist,
  type ChecklistItemStatus,
  type IntakeChecklistData,
} from "@/lib/leads/intake-checklist";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";

interface LeadIntakeChecklistProps {
  lead: LeadWithOwner;
  notes?: NoteWithAuthor[];
  canEdit: boolean;
  variant: "intake" | "site_visit";
  onUpdated: () => void;
  onToast: (message: string) => void;
}

export function LeadIntakeChecklist({
  lead,
  notes = [],
  canEdit,
  variant,
  onUpdated,
  onToast,
}: LeadIntakeChecklistProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<ChecklistItemStatus | null>(null);
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
      lead.appointments,
      notes
    );
    const progress = getIntakeProgress(
      lead,
      checklist,
      lead.appointments,
      notes
    );

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
            <IntakeChecklistRow
              key={item.key}
              item={item}
              onShowDetail={setDetailItem}
            />
          ))}
        </ul>
        {saving && (
          <p className="text-[10px] text-field-cream/40 mt-3 text-center">
            Saving…
          </p>
        )}
        {detailItem && (
          <IntakeChecklistDetailModal
            item={detailItem}
            onClose={() => setDetailItem(null)}
          />
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
                <ScopeBooleanInput
                  value={val === true ? true : val === false ? false : null}
                  disabled={!canEdit || saving}
                  onCommit={(choice) => {
                    const nextSite = { ...site };
                    if (choice === null) {
                      delete nextSite[def.key];
                    } else {
                      nextSite[def.key] = choice;
                    }
                    const next: IntakeChecklistData = {
                      ...checklist,
                      site_visit: nextSite,
                    };
                    void persist(next);
                  }}
                />
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

function IntakeChecklistRow({
  item,
  onShowDetail,
}: {
  item: ChecklistItemStatus;
  onShowDetail: (item: ChecklistItemStatus) => void;
}) {
  const canShowDetail = item.complete && Boolean(item.detail?.trim());

  const content = (
    <>
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
      <div className="min-w-0 flex-1 text-left">
        <p
          className={`text-sm ${
            item.complete ? "text-field-cream" : "text-field-cream/75"
          }`}
        >
          {item.label}
        </p>
        {item.hint && (
          <p className="text-[10px] text-field-cream/40 mt-0.5">{item.hint}</p>
        )}
        {canShowDetail && (
          <p className="text-[10px] text-field-gold/70 mt-1">
            Tap to view details
          </p>
        )}
      </div>
    </>
  );

  if (!canShowDetail) {
    return (
      <li
        className={`flex items-start gap-3 rounded-lg px-3 py-2.5 min-h-[48px] ${
          item.complete
            ? "bg-field-sage/10 border border-field-sage/25"
            : "bg-field-dark/30 border border-field-line/15"
        }`}
      >
        {content}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onShowDetail(item)}
        title={item.detail ?? undefined}
        className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 min-h-[48px] text-left transition ${
          item.complete
            ? "bg-field-sage/10 border border-field-sage/25 hover:bg-field-sage/20 hover:border-field-sage/40 cursor-pointer"
            : "bg-field-dark/30 border border-field-line/15"
        }`}
      >
        {content}
      </button>
    </li>
  );
}

function IntakeChecklistDetailModal({
  item,
  onClose,
}: {
  item: ChecklistItemStatus;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-field-dark/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="checklist-detail-title"
        className="relative w-full max-w-md rounded-xl border border-field-sage/30 bg-field-dark p-5 shadow-2xl"
      >
        <h3
          id="checklist-detail-title"
          className="text-sm font-semibold uppercase tracking-wider text-field-gold mb-1"
        >
          {item.label}
        </h3>
        {item.hint && (
          <p className="text-[10px] text-field-cream/45 mb-3">{item.hint}</p>
        )}
        <p className="text-sm text-field-cream whitespace-pre-wrap leading-relaxed">
          {item.detail}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full min-h-[44px] rounded-lg bg-field-gold px-4 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ScopeBooleanInput({
  value,
  disabled,
  onCommit,
}: {
  value: boolean | null;
  disabled: boolean;
  onCommit: (choice: boolean | null) => void;
}) {
  const options: { key: "unset" | "no" | "yes"; label: string; choice: boolean | null }[] =
    [
      { key: "unset", label: "Not set", choice: null },
      { key: "no", label: "No", choice: false },
      { key: "yes", label: "Yes", choice: true },
    ];

  return (
    <div
      className="grid grid-cols-3 gap-1 min-h-[48px] rounded-lg border border-field-line/20 bg-field-dark/30 p-1"
      role="group"
      aria-label="Yes or no"
    >
      {options.map((opt) => {
        const selected =
          opt.choice === null
            ? value === null
            : value === opt.choice;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onCommit(opt.choice)}
            className={`min-h-[40px] rounded-md px-2 text-xs font-semibold transition ${
              selected
                ? opt.choice === true
                  ? "bg-field-sage/25 text-field-sage border border-field-sage/40"
                  : opt.choice === false
                    ? "bg-field-turf/30 text-field-cream border border-field-line/30"
                    : "bg-field-dark/50 text-field-cream/70 border border-field-line/25"
                : "text-field-cream/50 hover:text-field-cream hover:bg-field-turf/15 border border-transparent"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
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
  const saved = value != null ? String(value) : "";
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const commitDraft = (raw: string) => {
    if (raw.trim() === "") return;
    const num = Number(raw);
    if (!isNaN(num) && num !== value) onCommit(num);
  };

  usePendingFieldSave(
    draft,
    saved,
    (next) => {
      if (next != null) commitDraft(next);
    },
    { debounceMs: 700 }
  );

  return (
    <input
      type="number"
      min={0}
      disabled={disabled}
      value={draft}
      placeholder="Enter value"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() === "") {
          setDraft(saved);
          return;
        }
        commitDraft(draft);
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

  usePendingFieldSave(draft, value, (next) => onCommit(next ?? ""), {
    debounceMs: 700,
  });

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