"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import {
  DEFAULT_LEAD_SEARCH_FILTERS,
  filterLeads,
  hasActiveFilters,
  type LeadNoteSearchIndex,
  type LeadSearchFilters,
} from "@/lib/leads/search";
import { groupLeadsByStage } from "@/lib/leads/utils";
import { moveLeadStage } from "@/lib/leads/actions";
import {
  PIPELINE_STAGES,
  parseLeadDraggableId,
  parseStageDroppableId,
} from "@/lib/leads/constants";
import type { LeadStage, UserRole } from "@/types/database";
import { SiteVisitCalendar } from "@/components/calendar/SiteVisitCalendar";
import type { CalendarSiteVisit } from "@/lib/calendar/types";
import {
  buildFieldHref,
  type FieldView,
} from "@/lib/calendar/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { BulkOwnerAssignBar } from "./BulkOwnerAssignBar";
import { AddLeadModal } from "./AddLeadModal";
import { LeadCard } from "./LeadCard";
import {
  LeadDetailPanel,
  type LeadDetailPanelDraftApi,
} from "./LeadDetailPanel";
import { LeadSearchBar } from "./LeadSearchBar";
import { PipelineColumn } from "./PipelineColumn";

interface FieldBoardProps {
  initialLeads: LeadWithOwner[];
  initialLeadId?: string | null;
  noteSearchIndex?: LeadNoteSearchIndex;
  currentUserId: string;
  currentUserRole: UserRole;
  fieldView?: FieldView;
  calendarAppointments?: CalendarSiteVisit[];
  calendarYear?: number;
  calendarMonth?: number;
}

export function FieldBoard({
  initialLeads,
  initialLeadId = null,
  noteSearchIndex = {},
  currentUserId,
  currentUserRole,
  fieldView = "pipeline",
  calendarAppointments = [],
  calendarYear = new Date().getFullYear(),
  calendarMonth = new Date().getMonth(),
}: FieldBoardProps) {
  const isCalendarView = fieldView === "calendar";
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    initialLeadId
  );

  useEffect(() => {
    if (initialLeadId && leads.some((l) => l.id === initialLeadId)) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId, leads]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<LeadSearchFilters>(
    DEFAULT_LEAD_SEARCH_FILTERS
  );
  const draftApiRef = useRef<LeadDetailPanelDraftApi | null>(null);

  const isManager = currentUserRole === "manager";

  const filteredLeads = useMemo(
    () => filterLeads(leads, searchFilters, currentUserId, noteSearchIndex),
    [leads, searchFilters, currentUserId, noteSearchIndex]
  );

  const filtersActive = hasActiveFilters(searchFilters);

  const grouped = useMemo(
    () => groupLeadsByStage(filteredLeads),
    [filteredLeads]
  );
  const capturedLeads = grouped.lead_captured;
  const unclaimedCaptured = useMemo(
    () => capturedLeads.filter((l) => !l.owner_id),
    [capturedLeads]
  );

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

  const handleOpenDetail = useCallback(
    async (lead: LeadWithOwner) => {
      if (selectedLeadId && selectedLeadId !== lead.id && draftApiRef.current) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        await new Promise((resolve) => window.setTimeout(resolve, 0));
        await draftApiRef.current.flushPendingSaves();
      }
      setSelectedLeadId(lead.id);
    },
    [selectedLeadId]
  );

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
        <div className="bg-field-dark/50 border-b border-field-line/15 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/locker"
              className="text-xs font-medium text-field-gold/80 hover:text-field-gold transition shrink-0"
            >
              ← Locker Room
            </Link>
            <div
              className="inline-flex rounded-lg border border-field-line/25 p-0.5 bg-field-dark/60"
              role="tablist"
              aria-label="Field view"
            >
              <Link
                href={buildFieldHref({ lead: selectedLeadId })}
                role="tab"
                aria-selected={!isCalendarView}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  !isCalendarView
                    ? "bg-field-turf/30 text-field-cream"
                    : "text-field-cream/50 hover:text-field-cream"
                }`}
              >
                Pipeline
              </Link>
              <Link
                href={buildFieldHref({
                  view: "calendar",
                  lead: selectedLeadId,
                })}
                role="tab"
                aria-selected={isCalendarView}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  isCalendarView
                    ? "bg-field-turf/30 text-field-cream"
                    : "text-field-cream/50 hover:text-field-cream"
                }`}
              >
                📅 Calendar
              </Link>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-field-cream/30 shrink-0 hidden sm:inline">
              The Field
            </span>
          </div>
        </div>

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

        {!isCalendarView && (
          <>
            <LeadSearchBar
              leads={leads}
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              filteredCount={filteredLeads.length}
              isManager={isManager}
            />
            {isManager && (
              <div className="px-4 py-2 border-b border-field-line/15 bg-field-dark/30">
                <div className="max-w-7xl mx-auto">
                  <BulkOwnerAssignBar
                    filteredLeads={filteredLeads}
                    filters={searchFilters}
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-field-dark/40 border-b border-field-line/30 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {isCalendarView ? (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-field-gold">
                      Site Visit Calendar
                    </h2>
                    <p className="text-xs text-field-cream/50 mt-0.5">
                      Past and upcoming inspections &amp; site surveys
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-field-gold">
                      Lead Box
                    </h2>
                    <p className="text-xs text-field-cream/50 mt-0.5">
                      {capturedLeads.length === 0
                        ? "New leads land in the Lead Captured column below"
                        : `${capturedLeads.length} in Lead Captured${
                            unclaimedCaptured.length > 0
                              ? ` · ${unclaimedCaptured.length} unclaimed`
                              : ""
                          }`}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition shrink-0 self-start sm:self-auto"
              >
                + Add Lead
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 field-pattern px-4 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            {isCalendarView ? (
              <SiteVisitCalendar
                appointments={calendarAppointments}
                year={calendarYear}
                month={calendarMonth}
                currentUserId={currentUserId}
                isManager={isManager}
                contextLeadId={selectedLeadId}
              />
            ) : filteredLeads.length === 0 && filtersActive ? (
              <EmptyState
                icon="🔍"
                title="No leads match your filters"
                description="Try a different search term or clear filters to see the full pipeline."
                action={
                  <button
                    type="button"
                    onClick={() => setSearchFilters(DEFAULT_LEAD_SEARCH_FILTERS)}
                    className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <>
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
                        leads={grouped[stage.key as LeadStage]}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onBlocked={showBlocked}
                        onOpenDetail={handleOpenDetail}
                        activeDragId={activeDragId}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
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
        onDraftApi={(api) => {
          draftApiRef.current = api;
        }}
        onClose={() => setSelectedLeadId(null)}
        onLeadClosed={() => {
          setSelectedLeadId(null);
          router.refresh();
        }}
      />
    </DndContext>
  );
}