import { formatClosesDelta } from "@/lib/stats/types";
import type { PersonalStats } from "@/lib/stats/types";
import { formatCurrency } from "@/lib/leads/format";

interface ScoreboardStripProps {
  stats: PersonalStats;
}

export function ScoreboardStrip({ stats }: ScoreboardStripProps) {
  const closesDelta = formatClosesDelta(
    stats.closesThisMonth,
    stats.closesLastMonth
  );

  const items = [
    {
      label: "Closes",
      value: stats.closesThisMonth,
      suffix: "this mo.",
      delta: closesDelta,
    },
    { label: "Win Rate", value: `${stats.winRate}%` },
    { label: "Avg Cycle", value: `${stats.avgCycleDays}d` },
    { label: "Pipeline", value: formatCurrency(stats.openPipelineValue) },
    { label: "Active", value: stats.activeLeadCount },
  ];

  return (
    <div className="bg-field-dark/80 border-b border-field-line/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4 overflow-x-auto scrollbar-hide">
        <span className="text-xs font-semibold uppercase tracking-wider text-field-gold whitespace-nowrap">
          Scoreboard
        </span>
        <div className="flex gap-6">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline gap-1.5 whitespace-nowrap"
            >
              <span className="text-xs text-field-cream/50">{item.label}</span>
              <span className="text-sm font-bold text-field-cream">
                {item.value}
              </span>
              {item.suffix && (
                <span className="text-xs text-field-cream/40">{item.suffix}</span>
              )}
              {item.delta && (
                <span
                  className={`text-xs font-medium ${
                    item.delta.positive === true
                      ? "text-field-gold"
                      : item.delta.positive === false
                        ? "text-field-cream/50"
                        : "text-field-cream/40"
                  }`}
                >
                  {item.delta.text}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}