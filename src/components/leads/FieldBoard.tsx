"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { LeadWithOwner } from "@/lib/leads/types";
import { groupLeadsByStage } from "@/lib/leads/utils";
import { moveLeadStage } from "@/lib/leads/actions";
import {
  PIPELINE_STAGES,
  parseLeadDraggableId,
  parseStageDroppableId,
} from "@/lib/leads/constants";
import type { LeadStage, UserRole } from "@/types/database";
import { AddLeadModal } from "./AddLeadModal";
import { DraggableLeadCard } from "./DraggableLeadCard";
import { LeadCard } from "./LeadCard";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { PipelineColumn } from "./PipelineColumn";

interface FieldBoardProps {
  initialLeads: LeadWithOwner[];
  currentUserId: string;
  currentUserRole: UserRole;
}

export function FieldBoard({
  initialLeads,
  currentUserId,
  currentUserRole,
}: FieldBoardProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grouped = useMemo(() => groupLeadsByStage(leads), [leads]);
  const leadBoxLeads = grouped.lead_captured;

  const activeLead = useMemo(() => {
    if (!activeDragId) return null;
    const leadId = parseLeadDraggableId(activeDragId);
    return leads.find((l) => l.id === leadId) ?? null;
  }, [activeDragId, leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const showBlocked = useCallback((message: string) => {
    setBlockedMessage(message);
    setTimeout(() => setBlockedMessage(null), 4000);
  }, []);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const handleOpenDetail = useCallback((lead: LeadWithOwner) => {
    setSelectedLeadId(lead.id);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setErrorMessage(null);
    const editable = event.active.data.current?.editable;
    if (editable === false) {
      showBlocked("You can only move leads you own. Managers can move any lead.");
      return;
    }
    setActiveDragId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);

    const leadId = parseLeadDraggableId(String(event.active.id));
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!leadId || !overId) return;

    const newStage = parseStageDroppableId(overId);
    if (!newStage) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const previousLeads = leads;
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    const result = await moveLeadStage(leadId, newStage);

    if (!result.success) {
      setLeads(previousLeads);
      setErrorMessage(result.error);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    router.refresh();
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-full flex flex-col">
        {(blockedMessage || errorMessage) && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4">
            <div
              className={`rounded-lg px-4 py-3 text-sm shadow-lg border ${
                errorMessage
                  ? "bg-red-950/90 border-red-800/50 text-red-200"
                  : "bg-field-dark/95 border-field-gold/40 text-field-cream"
              }`}
            >
              {errorMessage ?? blockedMessage}
            </div>
          </div>
        )}

        {/* Lead Box */}
        <div className="bg-field-dark/40 border-b border-field-line/30 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-field-gold">
                  Lead Box
                </h2>
                <p className="text-xs text-field-cream/50 mt-0.5">
                  {leadBoxLeads.length === 0
                    ? "Drag leads onto the field below — or add one manually"
                    : `${leadBoxLeads.length} lead${leadBoxLeads.length === 1 ? "" : "s"} at Lead Captured`}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition shrink-0 self-start sm:self-auto"
              >
                + Add Lead
              </button>
            </div>

            {leadBoxLeads.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-field-line/30 p-6 text-center">
                <p className="text-field-cream/40 text-sm">No leads in the box</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-2 text-sm text-field-gold hover:underline"
                >
                  Add your first lead
                </button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {leadBoxLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onBlocked={showBlocked}
                    onOpenDetail={handleOpenDetail}
                    isDragging={activeDragId === `lead:${lead.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The Field */}
        <div className="flex-1 field-pattern px-4 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-[10px] uppercase tracking-wider text-field-cream/35 mb-2 lg:hidden">
              Swipe field →
            </p>
            <div className="overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible scrollbar-hide">
              <div className="flex lg:grid lg:grid-cols-5 gap-3 w-max lg:w-auto">
                {PIPELINE_STAGES.map((stage, index) => (
                  <PipelineColumn
                    key={stage.key}
                    stage={stage.key}
                    label={stage.label}
                    index={index}
                    leads={
                      stage.key === "lead_captured"
                        ? []
                        : grouped[stage.key as LeadStage]
                    }
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onBlocked={showBlocked}
                    onOpenDetail={handleOpenDetail}
                    activeDragId={activeDragId}
                    isLeadCapturedDropZone={stage.key === "lead_captured"}
                    leadCapturedCount={leadBoxLeads.length}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <LeadCard
            lead={activeLead}
            currentUserId={currentUserId}
            isOverlay
          />
        ) : null}
      </DragOverlay>

      <AddLeadModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />

      <LeadDetailPanel
        lead={selectedLead}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedLeadId(null)}
        onLeadClosed={() => {
          setSelectedLeadId(null);
          router.refresh();
        }}
      />
    </DndContext>
  );
}