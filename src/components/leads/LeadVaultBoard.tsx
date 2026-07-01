"use client";

import { useMemo, useState } from "react";
import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency, formatTimestamp } from "@/lib/leads/format";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import {
  DEFAULT_LEAD_SEARCH_FILTERS,
  filterLeads,
  hasActiveFilters,
  type LeadNoteSearchIndex,
  type LeadSearchFilters,
} from "@/lib/leads/search";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { UserRole } from "@/types/database";
import { EmptyState } from "@/components/ui/EmptyState";
import { BulkOwnerAssignBar } from "./BulkOwnerAssignBar";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { LeadSearchBar } from "./LeadSearchBar";

interface LeadVaultBoardProps {
  leads: LeadWithOwner[];
  noteSearchIndex: LeadNoteSearchIndex;
  currentUserId: string;
  currentUserRole: UserRole;
}

const STATUS_STYLES = {
  active: "bg-field-turf/25 text-field-cream border-field-line/25",
  closed_won: "bg-field-gold/15 text-field-gold border-field-gold/30",
  closed_lost: "bg-field-sage/15 text-field-sage border-field-sage/30",
} as const;

const STATUS_LABELS = {
  active: "Active",
  closed_won: "Won",
  closed_lost: "Lost",
} as const;

export function LeadVaultBoard({
  leads,
  noteSearchIndex,
  currentUserId,
  currentUserRole,
}: LeadVaultBoardProps) {
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

  const counts = useMemo(
    () => ({
      active: leads.filter((l) => l.status === "active").length,
      won: leads.filter((l) => l.status === "closed_won").length,
      lost: leads.filter((l) => l.status === "closed_lost").length,
    }),
    [leads]
  );

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="rounded-xl border border-field-line/20 overflow-hidden">
          <LeadSearchBar
            leads={leads}
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            filteredCount={filteredLeads.length}
            isManager={isManager}
            showStatusFilter
          />
        </div>
        {isManager && (
          <BulkOwnerAssignBar
            filteredLeads={filteredLeads}
            filters={searchFilters}
          />
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-field-cream/45">
        <span className="rounded-full border border-field-line/20 px-2.5 py-1">
          {counts.active} active
        </span>
        <span className="rounded-full border border-field-gold/25 px-2.5 py-1 text-field-gold/70">
          {counts.won} won
        </span>
        <span className="rounded-full border border-field-sage/25 px-2.5 py-1 text-field-sage/80">
          {counts.lost} lost
        </span>
        <span className="rounded-full border border-field-line/20 px-2.5 py-1">
          {leads.length} total
        </span>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={filtersActive ? "🔍" : "🗄️"}
          title={
            filtersActive ? "No leads match your search" : "Lead vault is empty"
          }
          description={
            filtersActive
              ? "Try different keywords — search includes notes, square footage, addresses, and more."
              : "Leads appear here as soon as they are added to the pipeline."
          }
          action={
            filtersActive ? (
              <button
                type="button"
                onClick={() => setSearchFilters(DEFAULT_LEAD_SEARCH_FILTERS)}
                className="rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-field-line/20 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.6fr)] gap-3 px-4 py-2.5 bg-field-dark/50 border-b border-field-line/15 text-[10px] uppercase tracking-wider text-field-cream/40">
            <span>Lead</span>
            <span>Status</span>
            <span>Stage</span>
            <span>Owner</span>
            <span className="text-right">Updated</span>
          </div>
          <ul className="divide-y divide-field-line/10">
            {filteredLeads.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="w-full text-left px-4 py-3 hover:bg-field-turf/10 transition"
                >
                  <div className="sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.6fr)] sm:gap-3 sm:items-center">
                    <div className="min-w-0">
                      <p className="font-semibold text-field-cream truncate">
                        {formatLeadDisplayName(lead)}
                      </p>
                      <p className="text-[11px] text-field-cream/45 truncate mt-0.5">
                        {getSourceDisplayLabel(lead.source, lead.referral_name)}
                        {lead.value != null && lead.status !== "active" && (
                          <span className="text-field-gold ml-2">
                            {formatCurrency(lead.value)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span
                        className={`inline-flex text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 ${STATUS_STYLES[lead.status]}`}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </div>
                    <p className="text-xs text-field-cream/60 mt-1 sm:mt-0">
                      {STAGE_LABELS[lead.stage]}
                    </p>
                    <p className="text-xs text-field-cream/55 mt-1 sm:mt-0 truncate">
                      {lead.owner_id
                        ? lead.owner?.full_name ?? "Unknown"
                        : "Unclaimed"}
                    </p>
                    <p className="text-[11px] text-field-cream/40 mt-1 sm:mt-0 sm:text-right tabular-nums">
                      {formatTimestamp(lead.updated_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
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