"use client";

import { useMemo, useState } from "react";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { UserRole } from "@/types/database";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClosedLeadCard } from "./ClosedLeadCard";
import { LeadDetailPanel } from "./LeadDetailPanel";

interface ClosedLeadsBoardProps {
  leads: LeadWithOwner[];
  currentUserId: string;
  currentUserRole: UserRole;
  variant: "won" | "lost";
  emptyTitle: string;
  emptyDescription: string;
}

export function ClosedLeadsBoard({
  leads,
  currentUserId,
  currentUserRole,
  variant,
  emptyTitle,
  emptyDescription,
}: ClosedLeadsBoardProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + (l.value ?? 0), 0),
    [leads]
  );

  return (
    <>
      {variant === "won" && leads.length > 0 && (
        <div className="mb-6 rounded-lg border border-field-gold/30 bg-field-gold/10 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-field-cream/70">
            {leads.length} deal{leads.length === 1 ? "" : "s"} closed-won
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
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