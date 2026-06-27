"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLeadNote } from "@/lib/leads/actions";
import { formatTimestamp } from "@/lib/leads/format";
import { parseIntakeChecklist } from "@/lib/leads/intake-checklist";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";

const composerClass =
  "w-full min-h-[120px] rounded-xl border border-field-line/30 bg-field-dark/40 px-4 py-3 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 resize-y leading-relaxed";

interface LeadNotesSectionProps {
  lead: LeadWithOwner;
  notes: NoteWithAuthor[];
  canEdit: boolean;
  onUpdated: () => void;
}

function NoteBlock({
  authorName,
  timestamp,
  content,
  variant = "default",
}: {
  authorName: string;
  timestamp: string;
  content: string;
  variant?: "default" | "legacy";
}) {
  return (
    <article
      className={`rounded-xl border px-4 py-3 ${
        variant === "legacy"
          ? "border-field-line/20 bg-field-dark/25"
          : "border-field-line/25 bg-field-dark/40"
      }`}
    >
      <header className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-field-line/15">
        <span className="text-xs font-semibold text-field-gold truncate">
          {authorName}
        </span>
        <time
          dateTime={timestamp}
          className="text-[11px] text-field-cream/45 shrink-0 tabular-nums"
        >
          {formatTimestamp(timestamp)}
        </time>
      </header>
      <p className="text-sm text-field-cream/90 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </article>
  );
}

export function LeadNotesSection({
  lead,
  notes,
  canEdit,
  onUpdated,
}: LeadNotesSectionProps) {
  const router = useRouter();
  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const legacyNotes = checklist.general_notes?.trim() ?? "";

  const [composer, setComposer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote() {
    const trimmed = composer.trim();
    if (!trimmed || !canEdit) return;

    setError(null);
    setSubmitting(true);

    const result = await addLeadNote(lead.id, trimmed);

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setComposer("");
    onUpdated();
    router.refresh();
  }

  const hasLegacy = legacyNotes.length > 0;
  const hasEntries = notes.length > 0 || hasLegacy;

  return (
    <section className="rounded-xl border border-field-gold/25 bg-field-turf/10 p-4">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
          Lead notes
        </h3>
        <p className="text-[11px] text-field-cream/45 mt-0.5 leading-relaxed">
          Each note is saved with your name and a timestamp. Scroll to read the
          full history.
        </p>
      </div>

      {canEdit && (
        <div className="mb-4 space-y-2">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void handleAddNote();
              }
            }}
            placeholder="Add a note — call summary, site access, objections, next steps…"
            rows={4}
            className={composerClass}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            disabled={submitting || !composer.trim()}
            onClick={() => void handleAddNote()}
            className="min-h-[44px] rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add note"}
          </button>
        </div>
      )}

      {hasEntries ? (
        <div className="max-h-[min(50vh,360px)] overflow-y-auto pr-1 space-y-3 scrollbar-hide">
          {hasLegacy && (
            <NoteBlock
              authorName="Team"
              timestamp={lead.updated_at}
              content={legacyNotes}
              variant="legacy"
            />
          )}
          {notes.map((note) => (
            <NoteBlock
              key={note.id}
              authorName={note.author?.full_name ?? "Unknown"}
              timestamp={note.created_at}
              content={note.content}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-field-cream/35 italic py-2">
          No notes yet — add the first entry above.
        </p>
      )}
    </section>
  );
}