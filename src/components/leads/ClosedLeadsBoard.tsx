"use client";

import { useMemo, useState } from "react";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { UserRole } from "@/types/database";
import {
  DEFAULT_LEAD_SEARCH_FILTERS,
  filterLeads,
  hasActiveFilters,
  type LeadNoteSearchIndex,
  type LeadSearchFilters,
} from "@/lib/leads/search";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClosedLeadCard } from "./ClosedLeadCard";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { LeadSearchBar } from "./LeadSearchBar";

interface ClosedLeadsBoardProps {
  leads: LeadWithOwner[];
  noteSearchIndex?: LeadNoteSearchIndex;
  currentUserId: string;
  currentUserRole: UserRole;
  variant: "won" | "lost";
  emptyTitle: string;
  emptyDescription: string;
}

export function ClosedLeadsBoard({
  leads,
  noteSearchIndex = {},
  currentUserId,
  currentUserRole,
  variant,
  emptyTitle,
  emptyDescription,
}: ClosedLeadsBoardProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<LeadSearchFilters>(
    DEFAULT_LEAD_SEARCH_FILTERS
  );

  const isManager = currentUserRole === "manager";
  const filtersActive = hasActiveFilters(searchFilters);

  const filteredLeads = useMemo(
    () => filterLeads(leads, searchFilters, currentUserId, noteSearchIndex),
    [leads, searchFilters, currentUserId, noteSearchIndex]
  );

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const totalValue = useMemo(
    () => filteredLeads.reduce((sum, l) => sum + (l.value ?? 0), 0),
    [filteredLeads]
  );

  return (
    <>
      {leads.length > 0 && (
        <div className="mb-4 rounded-xl border border-field-line/20 overflow-hidden">
          <LeadSearchBar
            leads={leads}
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            filteredCount={filteredLeads.length}
            isManager={isManager}
          />
        </div>
      )}

      {variant === "won" && filteredLeads.length > 0 && (
        <div className="mb-6 rounded-lg border border-field-gold/30 bg-field-gold/10 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-field-cream/70">
            {filteredLeads.length} deal{filteredLeads.length === 1 ? "" : "s"}{" "}
            closed-won
            {filtersActive && filteredLeads.length !== leads.length && (
              <span className="text-field-cream/45">
                {" "}
                (of {leads.length})
              </span>
            )}
          </span>
          <span className="text-lg font-bold text-field-gold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(totalValue)}
          </span>
        </div>
      )}

      {leads.length === 0 ? (
        <EmptyState
          icon={variant === "won" ? "🏆" : "📋"}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : filteredLeads.length === 0 && filtersActive ? (
        <EmptyState
          icon="🔍"
          title="No leads match your filters"
          description="Try a different search term or clear filters."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <ClosedLeadCard
              key={lead.id}
              lead={lead}
              currentUserId={currentUserId}
              variant={variant}
              onOpenDetail={() => setSelectedLeadId(lead.id)}
            />
          ))}
        </div>
      )}

      <LeadDetailPanel
        lead={selectedLead}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedLeadId(null)}
      />
    </>
  );
}