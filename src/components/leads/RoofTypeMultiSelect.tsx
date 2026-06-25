"use client";

import { useEffect, useRef, useState } from "react";
import {
  ROOF_TYPE_OPTIONS,
  formatRoofTypes,
  parseRoofTypes,
  roofTypeLabel,
  serializeRoofTypes,
  type RoofTypeValue,
} from "@/lib/leads/roof-types";

const inputClass =
  "w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40 min-h-[48px]";

interface RoofTypeMultiSelectProps {
  value: string | null | undefined;
  onChange: (serialized: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function RoofTypeMultiSelect({
  value,
  onChange,
  placeholder = "Select roof type(s)…",
  disabled = false,
  id,
}: RoofTypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [sectionNote, setSectionNote] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = parseRoofTypes(value);
  const legacyText =
    value && selected.length === 0 && value.trim() ? value.trim() : "";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function toggle(type: RoofTypeValue) {
    const next = selected.includes(type)
      ? selected.filter((t) => t !== type)
      : [...selected, type];
    onChange(serializeRoofTypes(next));
  }

  const display = formatRoofTypes(value);
  const noteSuffix = sectionNote.trim()
    ? ` (${sectionNote.trim()})`
    : legacyText && selected.length === 0
      ? ` (${legacyText})`
      : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} text-left flex items-center justify-between gap-2 ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={display || legacyText ? "text-field-cream" : "text-field-cream/35"}>
          {display || legacyText || placeholder}
          {selected.length > 1 && (
            <span className="text-field-cream/45 text-xs ml-1">(mixed roof)</span>
          )}
        </span>
        <span className="text-field-cream/40 shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-field-line/30 bg-field-dark shadow-xl py-1"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-field-cream/40">
            Select all that apply
          </p>
          {ROOF_TYPE_OPTIONS.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-field-turf/20 ${
                  checked ? "bg-field-gold/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-field-line/40 text-field-gold focus:ring-field-gold/40"
                />
                <span className="text-sm text-field-cream">{opt.label}</span>
              </label>
            );
          })}
          <div className="border-t border-field-line/20 px-3 py-2 mt-1">
            <label className="block text-[10px] text-field-cream/45 mb-1">
              Section notes (optional)
            </label>
            <input
              type="text"
              value={sectionNote}
              onChange={(e) => setSectionNote(e.target.value)}
              placeholder="e.g. metal on garage, shingle on house"
              className="w-full rounded border border-field-line/25 bg-field-turf/10 px-2 py-1.5 text-xs text-field-cream placeholder:text-field-cream/30"
            />
            {selected.length > 0 && sectionNote.trim() && (
              <p className="text-[10px] text-field-cream/40 mt-1">
                Saved as:{" "}
                {selected.map((t) => roofTypeLabel(t)).join(" + ")}
                {noteSuffix}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}