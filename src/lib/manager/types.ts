import type { LeadStage } from "@/types/database";

export type StageCounts = Record<LeadStage, number>;

export interface OwnerBreakdown {
  ownerId: string | null;
  ownerName: string;
  activeCount: number;
  pipelineValue: number;
  stages: StageCounts;
}

export interface TeamOverview {
  totalActive: number;
  totalUnclaimed: number;
  totalPipelineValue: number;
  closesThisMonth: number;
  stageCounts: StageCounts;
  ownerBreakdown: OwnerBreakdown[];
}