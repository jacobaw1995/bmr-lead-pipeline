"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LeadWithOwner } from "@/lib/leads/types";
import { canEditLead } from "@/lib/leads/permissions";
import { leadDraggableId } from "@/lib/leads/constants";
import type { UserRole } from "@/types/database";
import { LeadCard } from "./LeadCard";

interface DraggableLeadCardProps {
  lead: LeadWithOwner;
  currentUserId: string;
  currentUserRole: UserRole;
  onBlocked: (message: string) => void;
  onOpenDetail: (lead: LeadWithOwner) => void;
  isDragging?: boolean;
}

export function DraggableLeadCard({
  lead,
  currentUserId,
  currentUserRole,
  onBlocked,
  onOpenDetail,
  isDragging = false,
}: DraggableLeadCardProps) {
  const editable = canEditLead(lead, currentUserId, currentUserRole);

  const { attributes, listeners, setNodeRef, transform, isDragging: selfDragging } =
    useDraggable({
      id: leadDraggableId(lead.id),
      data: { lead, editable },
      disabled: !editable,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  function handleDragPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    if (!editable) {
      e.preventDefault();
      onBlocked(
        "You can only move leads you own. Managers can move any lead."
      );
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="relative flex gap-1">
      {editable && (
        <button
          type="button"
          aria-label="Drag to move lead"
          className="shrink-0 self-stretch w-6 flex items-center justify-center rounded-l-lg text-field-cream/25 hover:text-field-cream/55 hover:bg-field-turf/15 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleDragPointerDown}
          {...listeners}
          {...attributes}
        >
          <span className="text-sm leading-none" aria-hidden>
            ⠿
          </span>
        </button>
      )}
      <div className={`flex-1 min-w-0 ${editable ? "" : ""}`}>
        <LeadCard
          lead={lead}
          currentUserId={currentUserId}
          canEdit={editable}
          isDragging={isDragging || selfDragging}
          onOpenDetail={() => onOpenDetail(lead)}
        />
      </div>
    </div>
  );
}