import { formatCityState } from "@/lib/leads/address";
import {
  formatAppointmentCardBadge,
  getDisplayAppointment,
} from "@/lib/leads/appointments";
import { getMilestoneProgress } from "@/lib/leads/milestones";
import { phoneTelHref } from "@/lib/leads/phone";
import type { LeadWithOwner } from "@/lib/leads/types";
import { SOURCE_LABELS } from "@/lib/leads/constants";
import type { LeadStage } from "@/types/database";
import { LeadCardInlineValue } from "./LeadCardInlineValue";

const VALUE_STAGES: LeadStage[] = [
  "proposal_sent",
  "negotiating",
  "closed",
];

interface LeadCardProps {
  lead: LeadWithOwner;
  currentUserId: string;
  canEdit?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  onOpenDetail?: () => void;
}

export function LeadCard({
  lead,
  currentUserId,
  canEdit = false,
  isDragging = false,
  isOverlay = false,
  onOpenDetail,
}: LeadCardProps) {
  const isOwn = lead.owner_id === currentUserId;
  const isUnassigned = !lead.owner_id;
  const location = formatCityState(lead);
  const progress = getMilestoneProgress(lead, lead.appointments);
  const displayApt = getDisplayAppointment(lead.appointments);
  const showValueInput =
    canEdit &&
    (VALUE_STAGES.includes(lead.stage) || lead.value != null);
  const telHref = lead.phone ? phoneTelHref(lead.phone) : "";

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

      <div className="mt-2 space-y-1 text-xs text-field-cream/50">
        {lead.phone && telHref && !isOverlay ? (
          <a
            href={telHref}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="block text-field-cream/70 hover:text-field-gold transition"
          >
            {lead.phone}
          </a>
        ) : lead.phone ? (
          <p>{lead.phone}</p>
        ) : null}
        {location && <p className="truncate">{location}</p>}
        {displayApt && (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              displayApt.overdue
                ? "bg-red-950/50 text-red-300 border border-red-800/40"
                : "bg-field-gold/15 text-field-gold/90 border border-field-gold/25"
            }`}
          >
            {displayApt.overdue ? "⚠ " : "📅 "}
            {formatAppointmentCardBadge(
              displayApt.appointment.scheduled_at,
              displayApt.appointment.appointment_type
            )}
          </span>
        )}
        {showValueInput ? (
          <LeadCardInlineValue
            leadId={lead.id}
            currentValue={lead.value}
            canEdit={canEdit}
          />
        ) : lead.value != null ? (
          <p className="text-field-gold/80 font-medium">
            ${lead.value.toLocaleString()}
          </p>
        ) : null}
      </div>

      {lead.status === "active" && progress > 0 && (
        <div
          className="mt-2 h-1 rounded-full bg-field-line/20 overflow-hidden"
          title={`${progress}% job path complete`}
        >
          <div
            className="h-full rounded-full bg-field-gold/60 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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
              className="text-[10px] font-medium text-field-cream/40 hover:text-field-cream transition"
            >
              Details
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