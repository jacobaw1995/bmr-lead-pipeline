import { createClient } from "@/lib/supabase/server";
import type { LeadAppointment } from "@/types/database";
import type {
  ActivityWithActor,
  LeadHistory,
  LeadWithOwner,
  NoteWithAuthor,
} from "@/lib/leads/types";

export type { LeadWithOwner, LeadHistory, NoteWithAuthor, ActivityWithActor };

async function attachAppointments(
  leads: LeadWithOwner[]
): Promise<LeadWithOwner[]> {
  if (leads.length === 0) return leads;

  const supabase = await createClient();
  const leadIds = leads.map((l) => l.id);

  const { data: appointments } = await supabase
    .from("lead_appointments")
    .select("*")
    .in("lead_id", leadIds)
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at", { ascending: true });

  const byLead = new Map<string, LeadAppointment[]>();
  for (const apt of appointments ?? []) {
    const list = byLead.get(apt.lead_id) ?? [];
    list.push(apt as LeadAppointment);
    byLead.set(apt.lead_id, list);
  }

  return leads.map((lead) => ({
    ...lead,
    appointments: byLead.get(lead.id) ?? [],
  }));
}

export async function getActivePipelineLeads(): Promise<LeadWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return attachAppointments(data as LeadWithOwner[]);
}

export async function getLeadHistory(leadId: string): Promise<LeadHistory> {
  const supabase = await createClient();

  const [notesResult, activityResult] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("*, author:profiles!lead_notes_author_id_fkey(id, full_name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_activity")
      .select("*, actor:profiles!lead_activity_actor_id_fkey(id, full_name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
  ]);

  const activity = (activityResult.data ?? []) as ActivityWithActor[];
  const ownerIds = new Set<string>();

  for (const entry of activity) {
    if (entry.action !== "reassigned") continue;
    if (entry.from_value && entry.from_value !== "unclaimed") {
      ownerIds.add(entry.from_value);
    }
    if (entry.to_value && entry.to_value !== "unclaimed") {
      ownerIds.add(entry.to_value);
    }
  }

  let ownerNames: Record<string, string> = {};
  if (ownerIds.size > 0) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(ownerIds));

    ownerNames = Object.fromEntries(
      (owners ?? []).map((owner) => [owner.id, owner.full_name])
    );
  }

  return {
    notes: (notesResult.data ?? []) as NoteWithAuthor[],
    activity,
    ownerNames,
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

/** Every lead in the system — active, won, and lost. */
export async function getAllLeadsForVault(): Promise<LeadWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, owner:profiles!leads_owner_id_fkey(id, full_name)")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return attachAppointments(data as LeadWithOwner[]);
}

/** Note text grouped by lead id for full-text search (fails safe if table missing). */
export async function fetchLeadNoteSearchIndex(
  leadIds: string[]
): Promise<Record<string, string[]>> {
  if (leadIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .select("lead_id, content")
    .in("lead_id", leadIds);

  if (error || !data) return {};

  const index: Record<string, string[]> = {};
  for (const row of data) {
    const content = (row.content as string)?.trim();
    if (!content) continue;
    const list = index[row.lead_id as string] ?? [];
    list.push(content);
    index[row.lead_id as string] = list;
  }
  return index;
}