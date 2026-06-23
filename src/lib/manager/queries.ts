import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STAGES } from "@/lib/leads/constants";
import type { LeadWithOwner } from "@/lib/leads/types";
import type { LeadStage } from "@/types/database";
import type { OwnerBreakdown, StageCounts, TeamOverview } from "./types";

function emptyStageCounts(): StageCounts {
  return {
    lead_captured: 0,
    qualified: 0,
    proposal_sent: 0,
    negotiating: 0,
    closed: 0,
  };
}

function buildTeamOverview(
  activeLeads: LeadWithOwner[],
  closesThisMonth: number
): TeamOverview {
  const stageCounts = emptyStageCounts();
  const ownerMap = new Map<string | "unclaimed", OwnerBreakdown>();

  let totalPipelineValue = 0;
  let totalUnclaimed = 0;

  for (const lead of activeLeads) {
    stageCounts[lead.stage]++;

    if (
      lead.value != null &&
      ["proposal_sent", "negotiating"].includes(lead.stage)
    ) {
      totalPipelineValue += lead.value;
    }

    const key = lead.owner_id ?? "unclaimed";
    if (!lead.owner_id) totalUnclaimed++;

    if (!ownerMap.has(key)) {
      ownerMap.set(key, {
        ownerId: lead.owner_id,
        ownerName: lead.owner_id
          ? lead.owner?.full_name ?? "Unknown"
          : "Unclaimed",
        activeCount: 0,
        pipelineValue: 0,
        stages: emptyStageCounts(),
      });
    }

    const entry = ownerMap.get(key)!;
    entry.activeCount++;
    entry.stages[lead.stage]++;
    if (
      lead.value != null &&
      ["proposal_sent", "negotiating"].includes(lead.stage)
    ) {
      entry.pipelineValue += lead.value;
    }
  }

  const ownerBreakdown = Array.from(ownerMap.values()).sort((a, b) => {
    if (a.ownerId === null) return -1;
    if (b.ownerId === null) return 1;
    return b.activeCount - a.activeCount;
  });

  return {
    totalActive: activeLeads.length,
    totalUnclaimed,
    totalPipelineValue,
    closesThisMonth,
    stageCounts,
    ownerBreakdown,
  };
}

export async function getTeamOverview(): Promise<TeamOverview> {
  const supabase = await createClient();

  const [leadsResult, closesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed_won")
      .gte("closed_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const activeLeads = (leadsResult.data ?? []) as LeadWithOwner[];
  const closesThisMonth = closesResult.count ?? 0;

  return buildTeamOverview(activeLeads, closesThisMonth);
}

export function getMaxStageCount(stageCounts: StageCounts): number {
  return Math.max(...PIPELINE_STAGES.map((s) => stageCounts[s.key as LeadStage]), 1);
}