import { createClient } from "@/lib/supabase/server";

export type ImportBatchStatus = "active" | "undone";

export interface ImportBatchSummary {
  id: string;
  filename: string | null;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  status: ImportBatchStatus;
  createdAt: string;
  undoneAt: string | null;
  importerName: string;
  remainingLeads: number;
}

async function assertManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "manager") {
    return { ok: false, error: "Only managers can manage imports." };
  }
  return { ok: true };
}

export async function getImportBatches(): Promise<ImportBatchSummary[]> {
  const supabase = await createClient();

  const { data: batches, error } = await supabase
    .from("lead_import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !batches?.length) return [];

  const importerIds = Array.from(
    new Set(batches.map((b) => b.imported_by as string))
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", importerIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string])
  );

  const summaries: ImportBatchSummary[] = [];

  for (const batch of batches) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("import_batch_id", batch.id);

    summaries.push({
      id: batch.id,
      filename: batch.filename,
      rowCount: batch.row_count,
      importedCount: batch.imported_count,
      skippedCount: batch.skipped_count,
      status: batch.status as ImportBatchStatus,
      createdAt: batch.created_at,
      undoneAt: batch.undone_at,
      importerName: nameById.get(batch.imported_by) ?? "Unknown",
      remainingLeads: count ?? 0,
    });
  }

  return summaries;
}

/** Leads created via CSV before batch tracking existed. */
export async function getOrphanCsvImportCount(): Promise<number> {
  const leadIds = await getOrphanCsvImportLeadIds();
  return leadIds.length;
}

export async function getOrphanCsvImportLeadIds(): Promise<string[]> {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("lead_activity")
    .select("lead_id")
    .eq("action", "created")
    .eq("from_value", "csv_import");

  if (!activities?.length) return [];

  const leadIds = Array.from(new Set(activities.map((a) => a.lead_id)));

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .in("id", leadIds)
    .is("import_batch_id", null);

  return (leads ?? []).map((l) => l.id);
}

export { assertManager };