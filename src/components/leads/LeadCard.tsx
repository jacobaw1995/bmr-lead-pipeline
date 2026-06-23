import type { LeadWithOwner } from "@/lib/leads/types";
import { SOURCE_LABELS } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/leads/format";

interface LeadCardProps {
  lead: LeadWithOwner;
  currentUserId: string;
  isDragging?: boolean;
  isOverlay?: boolean;
  onOpenDetail?: () => void;
}

export function LeadCard({
  lead,
  currentUserId,
  isDragging = false,
  isOverlay = false,
  onOpenDetail,
}: LeadCardProps) {
  const isOwn = lead.owner_id === currentUserId;
  const isUnassigned = !lead.owner_id;

  return (
    <div
      className={`rounded-lg border bg-field-dark/50 p-3 transition ${
        isOverlay
          ? "border-field-gold shadow-lg shadow-field-gold/20 rotate-1 scale-105"
          : isDragging
            ? "opacity-40 border-field-line/20"
            : isOwn
              ? "border-field-gold/60 shadow-sm shadow-field-gold/10"
              : isUnassigned
                ? "border-field-line/40 border-dashed"
                : "border-field-line/25 opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-field-cream text-sm leading-tight">
          {lead.name}
        </h3>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-field-turf/40 text-field-cream/60">
          {SOURCE_LABELS[lead.source]}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-field-cream/50">
        {lead.phone && <p>{lead.phone}</p>}
        {lead.email && <p className="truncate">{lead.email}</p>}
        {lead.value != null && (
          <p className="text-field-gold/80 font-medium">
            {formatCurrency(lead.value)}
          </p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-field-line/10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {isUnassigned ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-field-gold/80">
              Unclaimed
            </span>
          ) : (
            <span className="text-[10px] text-field-cream/40">
              {isOwn ? "Your lead" : lead.owner?.full_name ?? "Unknown"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenDetail && !isOverlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenDetail();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[10px] font-medium text-field-gold/80 hover:text-field-gold transition"
            >
              Notes
            </button>
          )}
          <span className="text-[10px] text-field-cream/30">
            {formatRelativeTime(lead.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}