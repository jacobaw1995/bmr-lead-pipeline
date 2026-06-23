"use client";

import { useState } from "react";
import { addLeadNote } from "@/lib/leads/actions";
import { formatTimestamp } from "@/lib/leads/format";
import type { NoteWithAuthor } from "@/lib/leads/types";

interface LeadNotesProps {
  leadId: string;
  notes: NoteWithAuthor[];
  loading?: boolean;
  onNoteAdded: () => void;
}

export function LeadNotes({
  leadId,
  notes,
  loading,
  onNoteAdded,
}: LeadNotesProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await addLeadNote(leadId, content);

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setContent("");
    setSubmitting(false);
    onNoteAdded();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="note-input" className="sr-only">
          Add a note
        </label>
        <textarea
          id="note-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add intel for the team…"
          rows={3}
          className="w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 resize-none"
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add Note"}
        </button>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-field-turf/10 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-field-cream/40 text-center py-2">
          No notes yet — be the first to add intel
        </p>
      ) : (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-field-line/20 bg-field-dark/40 px-3 py-2.5"
            >
              <p className="text-sm text-field-cream/90 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              <p className="text-[11px] text-field-cream/40 mt-2">
                {note.author?.full_name ?? "Unknown"} ·{" "}
                {formatTimestamp(note.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}