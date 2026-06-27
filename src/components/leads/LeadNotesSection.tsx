"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateIntakeChecklist } from "@/lib/leads/actions";
import { formatTimestamp } from "@/lib/leads/format";
import {
  parseIntakeChecklist,
  type IntakeChecklistData,
} from "@/lib/leads/intake-checklist";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";
import { usePendingFieldSave } from "./usePendingFieldSave";

const textareaClass =
  "w-full min-h-[160px] rounded-xl border border-field-line/30 bg-field-dark/40 px-4 py-3 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 resize-y leading-relaxed";

interface LeadNotesSectionProps {
  lead: LeadWithOwner;
  notes: NoteWithAuthor[];
  canEdit: boolean;
  onUpdated: () => void;
}

export function LeadNotesSection({
  lead,
  notes,
  canEdit,
  onUpdated,
}: LeadNotesSectionProps) {
  const router = useRouter();
  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const savedNotes = checklist.general_notes ?? "";
  const [draft, setDraft] = useState(savedNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(savedNotes);
  }, [lead.id, savedNotes]);

  async function persistNotes(value: string | null) {
    if (!canEdit) return;
    const next: IntakeChecklistData = {
      ...checklist,
      general_notes: value ?? "",
    };
    setSaving(true);
    setError(null);
    const result = await updateIntakeChecklist(lead.id, next);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onUpdated();
    router.refresh();
  }

  usePendingFieldSave(draft, savedNotes, persistNotes, { debounceMs: 700 });

  const recentLog = notes.slice(-3).reverse();

  return (
    <section className="rounded-xl border border-field-gold/25 bg-field-turf/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
            Lead notes
          </h3>
          <p className="text-[11px] text-field-cream/45 mt-0.5 leading-relaxed">
            Objections, site intel, follow-ups — visible on every stage. Saves
            automatically.
          </p>
        </div>
        {saving && (
          <span className="text-[10px] text-field-cream/40 shrink-0">Saving…</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {canEdit ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== savedNotes) void persistNotes(draft || null);
          }}
          placeholder="Capture everything the team needs to know — call summaries, access details, pricing context, next steps…"
          rows={7}
          className={textareaClass}
        />
      ) : draft ? (
        <p className="text-sm text-field-cream/85 whitespace-pre-wrap leading-relaxed rounded-xl border border-field-line/20 bg-field-dark/30 px-4 py-3">
          {draft}
        </p>
      ) : (
        <p className="text-sm text-field-cream/35 italic px-1">No notes yet.</p>
      )}

      {recentLog.length > 0 && (
        <div className="mt-4 pt-3 border-t border-field-line/15">
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-2">
            Recent logged entries
          </p>
          <ul className="space-y-2">
            {recentLog.map((note) => (
              <li
                key={note.id}
                className="text-xs text-field-cream/60 leading-relaxed"
              >
                <span className="text-field-cream/80">{note.content}</span>
                <span className="block text-[10px] text-field-cream/35 mt-0.5">
                  {note.author?.full_name ?? "Unknown"} ·{" "}
                  {formatTimestamp(note.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}