import { createClient } from "@/lib/supabase/server";
import type { ActivityWithActor, LeadHistory, LeadWithOwner, NoteWithAuthor } from "@/lib/leads/types";

export type { LeadWithOwner, LeadHistory, NoteWithAuthor, ActivityWithActor };

export async function getActivePipelineLeads(): Promise<LeadWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as LeadWithOwner[];
}

export async function getLeadHistory(leadId: string): Promise<LeadHistory> {
  const supabase = await createClient();

  const [notesResult, activityResult] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("*, author:profiles!lead_notes_author_id_fkey(id, full_name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
    supabase
      .from("lead_activity")
      .select("*, actor:profiles!lead_activity_actor_id_fkey(id, full_name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    notes: (notesResult.data ?? []) as NoteWithAuthor[],
    activity: (activityResult.data ?? []) as ActivityWithActor[],
  };
}

export async function getClosedWonLeads(): Promise<LeadWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
    .eq("status", "closed_won")
    .order("closed_at", { ascending: false });

  if (error || !data) return [];

  return data as LeadWithOwner[];
}

export async function getClosedLostLeads(): Promise<LeadWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
    .eq("status", "closed_lost")
    .order("closed_at", { ascending: false });

  if (error || !data) return [];

  return data as LeadWithOwner[];
}