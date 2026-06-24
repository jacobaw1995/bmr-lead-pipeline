import type { BriefPriority } from "@/lib/brief/types";

const STYLES: Record<BriefPriority, string> = {
  urgent: "bg-red-950/60 text-red-300 border-red-800/40",
  high: "bg-field-gold/20 text-field-gold border-field-gold/30",
  medium: "bg-field-turf/30 text-field-cream/80 border-field-line/25",
  low: "bg-field-dark/50 text-field-cream/50 border-field-line/20",
  info: "bg-field-sage/15 text-field-sage border-field-sage/25",
};

const LABELS: Record<BriefPriority, string> = {
  urgent: "Now",
  high: "Priority",
  medium: "Today",
  low: "When you can",
  info: "Pool",
};

export function PriorityBadge({ priority }: { priority: BriefPriority }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${STYLES[priority]}`}
    >
      {LABELS[priority]}
    </span>
  );
}