"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLeadNote } from "@/lib/leads/actions";
import { formatTimestamp } from "@/lib/leads/format";
import { parseIntakeChecklist } from "@/lib/leads/intake-checklist";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";

const composerClass =
  "w-full min-h-[88px] rounded-lg border border-field-line/30 bg-field-dark/40 px-3 py-2.5 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 resize-none leading-relaxed";

interface LeadNotesSectionProps {
  lead: LeadWithOwner;
  notes: NoteWithAuthor[];
  canEdit: boolean;
  onUpdated: () => void;
  layout?: "column" | "inline";
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
      className={`rounded-lg border px-3 py-2.5 ${
        variant === "legacy"
          ? "border-field-line/20 bg-field-dark/25"
          : "border-field-line/25 bg-field-turf/10"
      }`}
    >
      <header className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-field-line/15">
        <span className="text-[11px] font-semibold text-field-gold truncate">
          {authorName}
        </span>
        <time
          dateTime={timestamp}
          className="text-[10px] text-field-cream/45 shrink-0 tabular-nums"
        >
          {formatTimestamp(timestamp)}
        </time>
      </header>
      <p className="text-xs text-field-cream/90 whitespace-pre-wrap leading-relaxed">
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
  layout = "column",
}: LeadNotesSectionProps) {
  const router = useRouter();
  const checklist = parseIntakeChecklist(lead.intake_checklist);
  const legacyNotes = checklist.general_notes?.trim() ?? "";

  const [composer, setComposer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const noteCount = notes.length + (hasLegacy ? 1 : 0);

  const title = (
    <>
      Lead notes
      {noteCount > 0 && (
        <span className="text-field-cream/40 font-normal ml-1.5">
          ({noteCount})
        </span>
      )}
    </>
  );

  const header =
    layout === "column" ? (
      <div className="shrink-0 px-4 py-3 border-b border-field-line/15">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
          {title}
        </h3>
        <p className="text-[10px] text-field-cream/45 mt-0.5 leading-relaxed">
          Name and timestamp on every entry.
        </p>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="w-full shrink-0 flex items-center justify-between gap-2 px-4 py-3 text-left border-b border-field-line/15"
        aria-expanded={mobileOpen}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-field-gold">
          {title}
        </span>
        <span className="text-field-cream/40 text-xs" aria-hidden>
          {mobileOpen ? "▲" : "▼"}
        </span>
      </button>
    );

  const composerBlock = canEdit && (
    <div
      className={
        layout === "column"
          ? "shrink-0 px-4 py-3 border-b border-field-line/15 space-y-2"
          : "shrink-0 px-4 py-3 border-b border-field-line/15 space-y-2"
      }
    >
      <textarea
        value={composer}
        onChange={(e) => setComposer(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void handleAddNote();
          }
        }}
        placeholder="Add a note…"
        rows={3}
        className={composerClass}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        disabled={submitting || !composer.trim()}
        onClick={() => void handleAddNote()}
        className="w-full min-h-[40px] rounded-lg bg-field-gold px-3 py-2 text-xs font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Add note"}
      </button>
    </div>
  );

  const history = (
    <div
      className={
        layout === "column"
          ? "flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5"
          : "flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5"
      }
    >
      {hasEntries ? (
        <>
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
        </>
      ) : (
        <p className="text-xs text-field-cream/35 italic py-2">
          No notes yet.
        </p>
      )}
    </div>
  );

  if (layout === "column") {
    return (
      <div className="flex flex-col h-full min-h-0 bg-field-dark/60">
        {header}
        {composerBlock}
        {history}
      </div>
    );
  }

  if (!mobileOpen) {
    return (
      <section className="sm:hidden shrink-0 border-b border-field-line/20 bg-field-dark/50">
        {header}
      </section>
    );
  }

  return (
    <section className="sm:hidden shrink-0 border-b border-field-line/20 bg-field-dark/50 flex flex-col max-h-[42vh] min-h-0">
      {header}
      {composerBlock}
      {history}
    </section>
  );
}