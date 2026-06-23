import { redirect } from "next/navigation";
import { MonthlyGoalCard } from "@/components/office/MonthlyGoalCard";
import { StatCard } from "@/components/office/StatCard";
import { formatCurrency } from "@/lib/leads/format";
import { getPersonalStats } from "@/lib/stats/queries";
import { formatClosesDelta } from "@/lib/stats/types";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const stats = await getPersonalStats();

  if (!stats) redirect("/login");

  const closesDelta = formatClosesDelta(
    stats.closesThisMonth,
    stats.closesLastMonth
  );

  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📊</span>
            <h1 className="text-2xl font-bold text-field-cream">
              Coach&apos;s Office
            </h1>
          </div>
          <p className="text-field-cream/50 text-sm">
            {profile?.full_name ?? "Your"} personal numbers — compared only to
            your own past performance. No team rankings here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyGoalCard stats={stats} />

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Closes This Month"
              value={stats.closesThisMonth}
              detail={closesDelta.text}
              highlight
            />
            <StatCard
              label="Last Month"
              value={stats.closesLastMonth}
              detail="Your prior month baseline"
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              detail="All-time closed deals"
            />
            <StatCard
              label="Avg Cycle"
              value={`${stats.avgCycleDays}d`}
              detail="Days to close-won"
            />
            <StatCard
              label="Open Pipeline"
              value={formatCurrency(stats.openPipelineValue)}
              detail="Proposal + negotiating"
            />
            <StatCard
              label="Active Leads"
              value={stats.activeLeadCount}
              detail="Currently on the field"
            />
          </div>
        </div>
      </div>
    </div>
  );
}