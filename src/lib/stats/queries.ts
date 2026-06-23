import { createClient } from "@/lib/supabase/server";
import type { PersonalStats } from "./types";

export async function getPersonalStats(): Promise<PersonalStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    closesThisMonth,
    closesLastMonth,
    winRate,
    avgCycleDays,
    openPipelineValue,
    activeLeadCount,
    profileResult,
  ] = await Promise.all([
    supabase.rpc("my_closes_this_month"),
    supabase.rpc("my_closes_last_month"),
    supabase.rpc("my_win_rate"),
    supabase.rpc("my_avg_cycle_days"),
    supabase.rpc("my_open_pipeline_value"),
    supabase.rpc("my_active_lead_count"),
    supabase
      .from("profiles")
      .select("monthly_close_goal")
      .eq("id", user.id)
      .single(),
  ]);

  return {
    closesThisMonth: closesThisMonth.data ?? 0,
    closesLastMonth: closesLastMonth.error ? 0 : (closesLastMonth.data ?? 0),
    winRate: Number(winRate.data ?? 0),
    avgCycleDays: Number(avgCycleDays.data ?? 0),
    openPipelineValue: Number(openPipelineValue.data ?? 0),
    activeLeadCount: activeLeadCount.data ?? 0,
    monthlyCloseGoal:
      profileResult.error ? null : (profileResult.data?.monthly_close_goal ?? null),
  };
}