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

  function handlePointerDown(e: React.PointerEvent) {
    if (!editable) {
      e.preventDefault();
      e.stopPropagation();
      onBlocked(
        "You can only move leads you own. Managers can move any lead."
      );
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none ${editable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}`}
      onPointerDown={handlePointerDown}
      {...(editable ? { ...listeners, ...attributes } : {})}
    >
      <LeadCard
        lead={lead}
        currentUserId={currentUserId}
        canEdit={editable}
        isDragging={isDragging || selfDragging}
        onOpenDetail={() => onOpenDetail(lead)}
      />
    </div>
  );
}