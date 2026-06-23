import { PIPELINE_STAGES } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/leads/format";
import { getMaxStageCount } from "@/lib/manager/queries";
import type { TeamOverview as TeamOverviewData } from "@/lib/manager/types";
import type { LeadStage } from "@/types/database";

interface TeamOverviewProps {
  data: TeamOverviewData;
}

export function TeamOverview({ data }: TeamOverviewProps) {
  const maxStage = getMaxStageCount(data.stageCounts);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Active Leads" value={data.totalActive} />
        <MetricCard
          label="Unclaimed"
          value={data.totalUnclaimed}
          highlight={data.totalUnclaimed > 0}
        />
        <MetricCard
          label="Team Pipeline"
          value={formatCurrency(data.totalPipelineValue)}
        />
        <MetricCard
          label="Closes This Month"
          value={data.closesThisMonth}
          detail="All salespeople"
        />
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-4">
          Pipeline by Stage
        </h2>
        <div className="rounded-xl border border-field-line/20 bg-field-dark/40 p-4 sm:p-5 space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const count = data.stageCounts[stage.key as LeadStage];
            const width = maxStage > 0 ? (count / maxStage) * 100 : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="text-xs text-field-cream/60 w-28 sm:w-32 shrink-0 truncate">
                  {stage.label}
                </span>
                <div className="flex-1 h-7 rounded bg-field-turf/20 overflow-hidden">
                  <div
                    className="h-full rounded bg-field-gold/50 transition-all min-w-[2px]"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-sm font-mono font-bold text-field-cream w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-4">
          Who Owns What
        </h2>
        {data.ownerBreakdown.length === 0 ? (
          <p className="text-sm text-field-cream/40 text-center py-6">
            No active leads on the field
          </p>
        ) : (
          <div className="rounded-xl border border-field-line/20 bg-field-dark/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-field-line/15 text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-field-cream/50">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-field-cream/50 text-right">
                      Active
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-field-cream/50 text-right hidden sm:table-cell">
                      Pipeline
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-field-cream/50 hidden md:table-cell">
                      Stages
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.ownerBreakdown.map((owner) => (
                    <tr
                      key={owner.ownerId ?? "unclaimed"}
                      className="border-b border-field-line/10 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-field-cream">
                        {owner.ownerName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-field-cream/80">
                        {owner.activeCount}
                      </td>
                      <td className="px-4 py-3 text-right text-field-gold/80 hidden sm:table-cell">
                        {formatCurrency(owner.pipelineValue)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {PIPELINE_STAGES.filter(
                            (s) => owner.stages[s.key as LeadStage] > 0
                          ).map((s) => (
                            <span
                              key={s.key}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-field-turf/30 text-field-cream/50"
                            >
                              {s.label.slice(0, 3)} {owner.stages[s.key as LeadStage]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string | number;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-field-gold/40 bg-field-gold/5"
          : "border-field-line/20 bg-field-dark/40"
      }`}
    >
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-field-cream/50">
        {label}
      </p>
      <p
        className={`mt-1 text-xl sm:text-2xl font-bold ${
          highlight ? "text-field-gold" : "text-field-cream"
        }`}
      >
        {value}
      </p>
      {detail && (
        <p className="text-[10px] text-field-cream/40 mt-1">{detail}</p>
      )}
    </div>
  );
}