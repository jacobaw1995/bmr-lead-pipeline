export interface PersonalStats {
  closesThisMonth: number;
  closesLastMonth: number;
  winRate: number;
  avgCycleDays: number;
  openPipelineValue: number;
  activeLeadCount: number;
  monthlyCloseGoal: number | null;
}

export function formatClosesDelta(
  thisMonth: number,
  lastMonth: number
): { text: string; positive: boolean | null } {
  const delta = thisMonth - lastMonth;
  if (delta === 0) {
    return { text: "same vs last mo.", positive: null };
  }
  const sign = delta > 0 ? "+" : "";
  return { text: `${sign}${delta} vs last mo.`, positive: delta > 0 };
}