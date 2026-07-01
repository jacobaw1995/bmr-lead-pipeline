"use client";

interface LeadBatchCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}

export function LeadBatchCheckbox({
  checked,
  disabled = false,
  onChange,
  label,
}: LeadBatchCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="h-4 w-4 shrink-0 rounded border-field-line/40 bg-field-dark text-field-gold focus:ring-field-gold/40 disabled:opacity-30"
    />
  );
}