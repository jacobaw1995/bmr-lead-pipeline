"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  formatBillingAddress,
  formatServiceAddress,
} from "@/lib/leads/address";
import { getSourceDisplayLabel } from "@/lib/leads/constants";
import { formatCurrency, formatTimestamp } from "@/lib/leads/format";
import {
  formatLeadDisplayName,
  getPrimaryPhone,
} from "@/lib/leads/profile";
import { PhoneContactLink } from "./PhoneContactLink";
import type { LeadHistory, LeadWithOwner } from "@/lib/leads/types";
import { DeleteLeadButton } from "./DeleteLeadButton";
import { LeadActivityTrail } from "./LeadActivityTrail";
import { LeadEditDetails } from "./LeadEditDetails";
import { LeadOwnerReassign } from "./LeadOwnerReassign";
import { LeadStagePicker } from "./LeadStagePicker";

interface LeadProspectPanelProps {
  lead: LeadWithOwner;
  history: LeadHistory | null;
  loading: boolean;
  canEdit: boolean;
  isManager: boolean;
  onUpdated: () => void;
  onDeleted?: () => void;
  /** When true, render as collapsible accordion (mobile). */
  accordion?: boolean;
  quickActions?: ReactNode;
}

function ProspectFields({
  lead,
  canEdit,
  isManager,
  onUpdated,
  onDeleted,
}: {
  lead: LeadWithOwner;
  canEdit: boolean;
  isManager: boolean;
  onUpdated: () => void;
  onDeleted?: () => void;
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
          <PhoneContactLink
            phone={primaryPhone}
            className="text-field-cream/80 hover:text-field-gold transition text-left"
          />
          {lead.secondary_phone && (
            <p className="text-xs text-field-cream/50 mt-1">
              Secondary:{" "}
              <PhoneContactLink
                phone={lead.secondary_phone}
                className="hover:text-field-gold transition"
              >
                {lead.secondary_phone}
              </PhoneContactLink>
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
        <label
          htmlFor={isManager && isActive ? `owner-${lead.id}` : undefined}
          className="text-[10px] uppercase tracking-wide text-field-cream/40 mb-1 block"
        >
          Owner
        </label>
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
              ? lead.owner?.full_name?.trim() || "Unknown"
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
            {getSourceDisplayLabel(lead.source, lead.referral_name)}
          </p>
        </div>
      </div>

      <LeadStagePicker
        leadId={lead.id}
        currentStage={lead.stage}
        canEdit={canEdit}
        isActive={isActive}
        onUpdated={onUpdated}
      />

      {!isActive && (
        <>
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

      {isManager && <DeleteLeadButton lead={lead} onDeleted={onDeleted} />}
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
  onDeleted,
  accordion = false,
  quickActions,
}: LeadProspectPanelProps) {
  const [prospectOpen, setProspectOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (accordion) {
    return (
      <div className="shrink-0">
        {quickActions && (
          <div className="px-4 py-3 border-b border-field-line/15">
            {quickActions}
          </div>
        )}
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
              onDeleted={onDeleted}
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
    <div className="flex flex-col h-full bg-field-dark/60 w-full sm:w-72 lg:w-80 shrink-0 min-h-0">
      {quickActions && (
        <div className="shrink-0 px-4 py-4 border-b border-field-line/20">
          {quickActions}
        </div>
      )}
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
            onDeleted={onDeleted}
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