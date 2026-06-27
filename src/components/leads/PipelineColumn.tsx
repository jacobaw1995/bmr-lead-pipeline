"use client";

import { useDroppable } from "@dnd-kit/core";
import type { LeadWithOwner } from "@/lib/leads/types";
import { stageDroppableId } from "@/lib/leads/constants";
import type { LeadStage, UserRole } from "@/types/database";
import { DraggableLeadCard } from "./DraggableLeadCard";

interface PipelineColumnProps {
  stage: LeadStage;
  label: string;
  index: number;
  leads: LeadWithOwner[];
  currentUserId: string;
  currentUserRole: UserRole;
  onBlocked: (message: string) => void;
  onOpenDetail: (lead: LeadWithOwner) => void;
  activeDragId: string | null;
}

export function PipelineColumn({
  stage,
  label,
  index,
  leads,
  currentUserId,
  currentUserRole,
  onBlocked,
  onOpenDetail,
  activeDragId,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDroppableId(stage),
    data: { stage },
  });

  return (
    <div
      className="flex flex-col w-[260px] shrink-0 lg:w-auto lg:shrink rounded-lg border border-field-line/40 bg-field-turf-dark/60 backdrop-blur-sm overflow-hidden min-h-[280px]"
    >
      <div className="px-3 py-2 border-b border-field-line/30 bg-field-dark/30 relative">
        <div
          className="absolute inset-x-0 top-0 h-px bg-field-line/20"
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-field-line/60">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-sm font-semibold text-field-cream">{label}</h3>
          </div>
          <span className="text-xs font-mono text-field-cream/40">
            {leads.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-3 flex flex-col gap-2 min-h-[200px] min-w-0 overflow-hidden transition-colors ${
          isOver
            ? "bg-field-gold/10 ring-2 ring-inset ring-field-gold/40"
            : ""
        }`}
      >
        {leads.length === 0 ? (
          <div className="flex-1 rounded border border-dashed border-field-line/20 flex items-center justify-center">
            <p className="text-xs text-field-cream/30">Drop leads here</p>
          </div>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onBlocked={onBlocked}
              onOpenDetail={onOpenDetail}
              isDragging={activeDragId === `lead:${lead.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}