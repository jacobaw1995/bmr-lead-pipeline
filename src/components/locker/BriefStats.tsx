import type { PersonalStats } from "@/lib/stats/types";

interface BriefStatsProps {
  stats: PersonalStats;
  appointmentsToday: number;
  actionCount: number;
}

export function BriefStats({
  stats,
  appointmentsToday,
  actionCount,
}: BriefStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatPill label="Today" value={String(appointmentsToday)} sub="visits" />
      <StatPill label="Actions" value={String(actionCount)} sub="due" />
      <StatPill
        label="Closes"
        value={String(stats.closesThisMonth)}
        sub="this mo."
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-field-line/15 bg-field-dark/30 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-field-cream/40">
        {label}
      </p>
      <p className="text-lg font-bold text-field-cream leading-tight">
        {value}
      </p>
      <p className="text-[10px] text-field-cream/35">{sub}</p>
    </div>
  );
}