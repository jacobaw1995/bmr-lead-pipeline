"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatBillingAddress,
  formatServiceAddress,
} from "@/lib/leads/address";
import { STAGE_LABELS, getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency, formatTimestamp } from "@/lib/leads/format";
import {
  formatLeadDisplayName,
  getPrimaryPhone,
} from "@/lib/leads/profile";
import { phoneTelHref } from "@/lib/leads/phone";
import type { LeadHistory, LeadWithOwner } from "@/lib/leads/types";
import { LeadActivityTrail } from "./LeadActivityTrail";
import { LeadEditDetails } from "./LeadEditDetails";
import { LeadOwnerReassign } from "./LeadOwnerReassign";

interface LeadProspectPanelProps {
  lead: LeadWithOwner;
  history: LeadHistory | null;
  loading: boolean;
  canEdit: boolean;
  isManager: boolean;
  onUpdated: () => void;
  /** When true, render as collapsible accordion (mobile). */
  accordion?: boolean;
}

function ProspectFields({
  lead,
  canEdit,
  isManager,
  onUpdated,
}: {
  lead: LeadWithOwner;
  canEdit: boolean;
  isManager: boolean;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const displayName = formatLeadDisplayName(lead);
  const primaryPhone = getPrimaryPhone(lead);
  const billingAddress = formatBillingAddress(lead);
  const serviceAddress = formatServiceAddress(lead);
  const isActive = lead.status === "active";

  const projectTags = [
    lead.homeowner_or_contractor,
    lead.remodel_or_new_construction,
    lead.existing_roof_type && `Existing: ${lead.existing_roof_type}`,
    lead.roof_type_requested && `Requested: ${lead.roof_type_requested}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
          Full name
        </p>
        <p className="text-field-cream font-medium">{displayName}</p>
        {lead.company_name && (
          <p className="text-field-cream/55 text-xs mt-0.5">
            {lead.company_name}
          </p>
        )}
      </div>

      {lead.email && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Email
          </p>
          <a
            href={`mailto:${lead.email}`}
            className="text-field-cream/80 hover:text-field-gold transition break-all"
          >
            {lead.email}
          </a>
        </div>
      )}

      {primaryPhone && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Phone
          </p>
          {phoneTelHref(primaryPhone) ? (
            <a
              href={phoneTelHref(primaryPhone)}
              className="text-field-cream/80 hover:text-field-gold transition"
            >
              {primaryPhone}
            </a>
          ) : (
            <p className="text-field-cream/80">{primaryPhone}</p>
          )}
          {lead.secondary_phone && (
            <p className="text-xs text-field-cream/50 mt-1">
              Secondary: {lead.secondary_phone}
            </p>
          )}
        </div>
      )}

      {billingAddress && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Billing address
          </p>
          <p className="text-field-cream/75 leading-snug">{billingAddress}</p>
        </div>
      )}

      {serviceAddress && billingAddress !== serviceAddress && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Service address
          </p>
          <p className="text-field-cream/60 leading-snug text-xs">
            {serviceAddress}
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
          Owner
        </p>
        {isManager && isActive ? (
          <LeadOwnerReassign
            lead={lead}
            onReassigned={() => {
              onUpdated();
              router.refresh();
            }}
          />
        ) : (
          <p className="text-field-cream/75">
            {lead.owner_id
              ? lead.owner?.full_name ?? "Unknown"
              : "Unclaimed"}
          </p>
        )}
      </div>

      {projectTags.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1.5">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {projectTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded bg-field-turf/25 text-field-cream/55"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Created
          </p>
          <p className="text-field-cream/60">
            {formatTimestamp(lead.created_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1">
            Source
          </p>
          <p className="text-field-cream/60">
            {getSourceDisplayLabel(lead.source)}
          </p>
        </div>
      </div>

      {isActive ? (
        <p className="text-xs text-field-cream/45">
          Stage: {STAGE_LABELS[lead.stage]}
        </p>
      ) : (
        <>
          <p className="text-xs text-field-cream/45">
            Was {STAGE_LABELS[lead.stage]}
          </p>
          {lead.value != null && (
            <p className="text-sm font-semibold text-field-gold">
              {formatCurrency(lead.value)}
            </p>
          )}
          {lead.closed_at && (
            <p className="text-xs text-field-cream/40">
              Closed {formatTimestamp(lead.closed_at)}
            </p>
          )}
          {lead.lost_reason && (
            <p className="text-xs text-field-sage/90 leading-relaxed">
              <span className="font-medium">Coaching note: </span>
              {lead.lost_reason}
            </p>
          )}
        </>
      )}

      {canEdit && isActive && (
        <LeadEditDetails lead={lead} onUpdated={onUpdated} />
      )}
    </div>
  );
}

export function LeadProspectPanel({
  lead,
  history,
  loading,
  canEdit,
  isManager,
  onUpdated,
  accordion = false,
}: LeadProspectPanelProps) {
  const [prospectOpen, setProspectOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  if (accordion) {
    return (
      <div className="shrink-0 border-b border-field-line/20 bg-field-dark/95">
        <button
          type="button"
          onClick={() => setProspectOpen((o) => !o)}
          className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={prospectOpen}
        >
          <span className="text-sm font-semibold text-field-gold">
            Prospect data
          </span>
          <span className="text-field-cream/50" aria-hidden>
            {prospectOpen ? "▲" : "▼"}
          </span>
        </button>
        {prospectOpen && (
          <div className="px-4 pb-4 max-h-[40vh] overflow-y-auto">
            <ProspectFields
              lead={lead}
              canEdit={canEdit}
              isManager={isManager}
              onUpdated={onUpdated}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 text-left border-t border-field-line/15"
          aria-expanded={historyOpen}
        >
          <span className="text-sm font-semibold text-field-gold">
            Revision history
          </span>
          <span className="text-field-cream/50" aria-hidden>
            {historyOpen ? "▲" : "▼"}
          </span>
        </button>
        {historyOpen && (
          <div className="px-4 pb-4 max-h-[35vh] overflow-y-auto">
            <LeadActivityTrail
              activity={history?.activity ?? []}
              loading={loading}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-field-line/20 bg-field-dark/60 w-full sm:w-80 lg:w-96 shrink-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
            Prospect data
          </h3>
          <ProspectFields
            lead={lead}
            canEdit={canEdit}
            isManager={isManager}
            onUpdated={onUpdated}
          />
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
            Revision history
          </h3>
          <LeadActivityTrail
            activity={history?.activity ?? []}
            loading={loading}
          />
        </section>
      </div>
    </div>
  );
}