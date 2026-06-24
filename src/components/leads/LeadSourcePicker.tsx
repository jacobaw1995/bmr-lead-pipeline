"use client";

import {
  CUSTOM_SOURCE_VALUE,
  STANDARD_LEAD_SOURCES,
} from "@/lib/leads/sources";

interface LeadSourcePickerProps {
  picked: string;
  customSource: string;
  onPickedChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  optional?: boolean;
  /** Unique radio group name when multiple pickers on one page */
  groupName?: string;
}

export function LeadSourcePicker({
  picked,
  customSource,
  onPickedChange,
  onCustomChange,
  optional = false,
  groupName = "lead-source",
}: LeadSourcePickerProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-field-cream/70 mb-2">
        Lead source
        {optional && (
          <span className="text-field-cream/40 font-normal ml-1">(optional)</span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {STANDARD_LEAD_SOURCES.map((source) => (
          <label
            key={source}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition text-xs ${
              picked === source
                ? "border-field-gold/50 bg-field-gold/10 text-field-cream"
                : "border-field-line/25 bg-field-turf/10 text-field-cream/65 hover:border-field-line/40"
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={source}
              checked={picked === source}
              onChange={() => onPickedChange(source)}
              className="accent-field-gold shrink-0"
            />
            <span className="leading-tight">{source}</span>
          </label>
        ))}
        <label
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition text-xs col-span-2 ${
            picked === CUSTOM_SOURCE_VALUE
              ? "border-field-gold/50 bg-field-gold/10 text-field-cream"
              : "border-field-line/25 bg-field-turf/10 text-field-cream/65 hover:border-field-line/40"
          }`}
        >
          <input
            type="radio"
            name={groupName}
            value={CUSTOM_SOURCE_VALUE}
            checked={picked === CUSTOM_SOURCE_VALUE}
            onChange={() => onPickedChange(CUSTOM_SOURCE_VALUE)}
            className="accent-field-gold shrink-0"
          />
          <span>Other — custom source</span>
        </label>
      </div>
      {picked === CUSTOM_SOURCE_VALUE && (
        <input
          type="text"
          value={customSource}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="e.g. Chamber of Commerce event"
          className="mt-2 w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
        />
      )}
    </div>
  );
}