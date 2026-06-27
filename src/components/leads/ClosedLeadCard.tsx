import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import {
  formatCurrency,
  formatCycleDays,
  formatTimestamp,
} from "@/lib/leads/format";
import type { LeadWithOwner } from "@/lib/leads/types";

interface ClosedLeadCardProps {
  lead: LeadWithOwner;
  currentUserId: string;
  variant: "won" | "lost";
  onOpenDetail: () => void;
}

export function ClosedLeadCard({
  lead,
  currentUserId,
  variant,
  onOpenDetail,
}: ClosedLeadCardProps) {
  const isOwn = lead.owner_id === currentUserId;

  const borderClass =
    variant === "won"
      ? isOwn
        ? "border-field-gold/50 shadow-sm shadow-field-gold/10"
        : "border-field-gold/25"
      : isOwn
        ? "border-field-sage/40"
        : "border-field-sage/20";

  const bgClass =
    variant === "won" ? "bg-field-dark/50" : "bg-field-sage/5";
  const sourceLabel = getSourceDisplayLabel(lead.source, lead.referral_name);

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className={`w-full text-left rounded-lg border p-4 transition hover:brightness-110 ${borderClass} ${bgClass} ${
        !isOwn ? "opacity-85" : ""
      }`}
    >
      <div className="min-w-0">
        <h3
          className="font-semibold text-field-cream truncate"
          title={formatLeadDisplayName(lead)}
        >
          {formatLeadDisplayName(lead)}
        </h3>
        <p
          className="mt-1 truncate text-[10px] text-field-cream/40"
          title={sourceLabel}
        >
          {sourceLabel}
        </p>
      </div>

      {variant === "won" && lead.value != null && (
        <p className="mt-2 text-lg font-bold text-field-gold">
          {formatCurrency(lead.value)}
        </p>
      )}

      {variant === "lost" && lead.lost_reason && (
        <p className="mt-2 text-sm text-field-cream/70 leading-relaxed line-clamp-3">
          <span className="text-field-sage/80 font-medium">Learned: </span>
          {lead.lost_reason}
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-field-cream/45">
        {variant === "lost" && (
          <p>Stage at close: {STAGE_LABELS[lead.stage]}</p>
        )}
        <p>
          {isOwn ? "Your lead" : lead.owner?.full_name ?? "Unassigned"}
        </p>
        {lead.closed_at && (
          <p>
            Closed {formatTimestamp(lead.closed_at)}
            {variant === "won" && (
              <> · {formatCycleDays(lead.created_at, lead.closed_at)} day cycle</>
            )}
          </p>
        )}
      </div>

      <p className="mt-2 text-[10px] font-medium text-field-gold/70">
        View notes & history →
      </p>
    </button>
  );
}