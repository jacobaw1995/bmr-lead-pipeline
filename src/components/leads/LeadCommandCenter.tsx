"use client";

import { useRouter } from "next/navigation";
import {
  COMMAND_STAGES,
  canNavigateToCommandStage,
  deriveActiveCommandStage,
  getCommandProgress,
  getCommandStageLabel,
  getRecommendedAction,
  isCommandStageComplete,
  type CommandStageKey,
} from "@/lib/leads/command-center";
import { formatLeadDisplayName } from "@/lib/leads/profile";
import type { LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";
import { ClaimLeadButton } from "./ClaimLeadButton";
import { LeadIntakeChecklist } from "./LeadIntakeChecklist";
import { LeadVitalFields } from "./LeadVitalFields";

interface LeadCommandCenterProps {
  lead: LeadWithOwner;
  canEdit: boolean;
  notes: NoteWithAuthor[];
  view: CommandStageKey;
  onViewChange: (view: CommandStageKey) => void;
  onRefresh: () => void;
  onToast: (message: string) => void;
}

export function LeadCommandCenter({
  lead,
  canEdit,
  notes,
  view,
  onViewChange,
  onRefresh,
  onToast,
}: LeadCommandCenterProps) {
  const router = useRouter();
  const appointments = lead.appointments ?? [];

  const activeJobPath = deriveActiveCommandStage(lead, appointments);
  const progress = getCommandProgress(lead, appointments);
  const recommended = getRecommendedAction(view, lead, appointments, notes);

  const displayName = formatLeadDisplayName(lead);
  const isUnclaimed = lead.status === "active" && !lead.owner_id;

  const completedPills = COMMAND_STAGES.map((s) =>
    isCommandStageComplete(s.key, lead, appointments, notes)
  );

  return (
    <>
      <div className="flex flex-col h-full min-w-0">
        <header className="shrink-0 px-4 sm:px-6 py-4 border-b border-field-line/15">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-field-cream truncate">
                {displayName}
              </h2>
              <p className="text-sm text-field-cream/50 mt-0.5">
                {getCommandStageLabel(view)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-field-gold">
                Progress
              </span>
              <span className="text-sm font-mono text-field-cream/50">
                {progress}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-field-dark/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-field-turf via-field-sage to-field-gold transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="mt-3 text-[10px] text-field-cream/40 leading-relaxed">
            Job path — separate from the board column. Use{" "}
            <span className="text-field-cream/55">Mark Complete</span> to
            advance; tabs only change what you&apos;re viewing.
          </p>

          <div className="mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div
              className="flex sm:flex-wrap gap-1 sm:gap-1.5 min-w-max sm:min-w-0"
              role="tablist"
              aria-label="Job path steps"
            >
              {COMMAND_STAGES.map((stage, i) => {
                const selected = view === stage.key;
                const done = completedPills[i];
                const isCurrent = activeJobPath === stage.key;
                const canOpen = canNavigateToCommandStage(
                  stage.key,
                  lead,
                  appointments,
                  notes
                );
                return (
                  <button
                    key={stage.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-disabled={!canOpen}
                    title={
                      !canOpen
                        ? "Complete earlier job path steps first"
                        : isCurrent
                          ? "Current step"
                          : done
                            ? "Completed — tap to review"
                            : stage.label
                    }
                    onClick={() => {
                      if (!canOpen) {
                        onToast("Complete earlier job path steps first.");
                        return;
                      }
                      onViewChange(stage.key);
                    }}
                    className={`shrink-0 min-h-[32px] sm:min-h-[38px] px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                      !canOpen
                        ? "bg-field-turf/10 text-field-cream/30 border border-field-line/15 cursor-not-allowed"
                        : selected
                          ? "bg-field-gold text-field-dark shadow-md"
                          : done
                            ? "bg-field-sage/20 text-field-sage border border-field-sage/30"
                            : isCurrent
                              ? "bg-field-turf/25 text-field-cream border border-field-gold/35"
                              : "bg-field-turf/20 text-field-cream/70 border border-field-line/20 hover:border-field-line/40"
                    }`}
                  >
                    <span className="sm:hidden">{stage.shortLabel}</span>
                    <span className="hidden sm:inline">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
          {isUnclaimed && (
            <ClaimLeadButton
              leadId={lead.id}
              onClaimed={() => {
                onRefresh();
                router.refresh();
              }}
            />
          )}

          {view === "new_lead" && (
            <LeadIntakeChecklist
              lead={lead}
              notes={notes}
              canEdit={canEdit}
              variant="intake"
              onUpdated={onRefresh}
              onToast={onToast}
            />
          )}

          {(view === "site_visit" || view === "scope") && (
            <LeadIntakeChecklist
              lead={lead}
              canEdit={canEdit}
              variant="site_visit"
              onUpdated={onRefresh}
              onToast={onToast}
            />
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-3">
              Vital data
            </h3>
            <LeadVitalFields
              view={view}
              lead={lead}
              notes={notes}
              canEdit={canEdit}
              onUpdated={onRefresh}
              onToast={onToast}
            />
          </section>

          <p className="text-sm text-field-cream/55 leading-relaxed border-t border-field-line/15 pt-4">
            <span className="text-field-gold font-medium">
              Next recommended action:{" "}
            </span>
            {recommended}
          </p>
        </div>
      </div>
    </>
  );
}