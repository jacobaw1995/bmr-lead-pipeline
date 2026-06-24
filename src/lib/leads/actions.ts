"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatFullAddress, normalizeAddress } from "@/lib/leads/address";
import {
  getMilestoneLabel,
  type MilestoneKey,
} from "@/lib/leads/milestones";
import { canEditLead } from "@/lib/leads/permissions";
import type { LeadSource, LeadStage } from "@/types/database";

export interface CreateLeadInput {
  name: string;
  phone?: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: LeadSource;
}

export async function createLead(
  input: CreateLeadInput
): Promise<{ success: true } | { success: false; error: string }> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to add a lead." };
  }

  const addr = normalizeAddress(input);
  const legacyAddress = formatFullAddress({
    address: null,
    street_address: addr.street_address,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
  });

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: legacyAddress,
      street_address: addr.street_address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      source: input.source ?? "manual",
      stage: "lead_captured",
      status: "active",
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (insertError || !lead) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to create lead.",
    };
  }

  await supabase.from("lead_activity").insert({
    lead_id: lead.id,
    actor_id: user.id,
    action: "created",
    to_value: "lead_captured",
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function moveLeadStage(
  leadId: string,
  newStage: LeadStage
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, stage, status, owner_id")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { success: false, error: "Closed leads cannot be moved." };
  }

  if (lead.stage === newStage) {
    return { success: true };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "salesman" | "manager") ?? "salesman";

  if (!canEditLead(lead, user.id, role)) {
    return {
      success: false,
      error: "You can only move leads you own. Managers can move any lead.",
    };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({ stage: newStage })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "stage_changed",
    from_value: lead.stage,
    to_value: newStage,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function setLeadValue(
  leadId: string,
  value: number | null
): Promise<{ success: true } | { success: false; error: string }> {
  if (value !== null && (isNaN(value) || value < 0)) {
    return { success: false, error: "Value must be a positive number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, stage, status, owner_id, value")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { success: false, error: "Cannot update value on a closed lead." };
  }

  const proposalStages: LeadStage[] = [
    "proposal_sent",
    "negotiating",
    "closed",
  ];
  if (!proposalStages.includes(lead.stage)) {
    return {
      success: false,
      error: "Move the lead to Proposal Sent before setting a quote value.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "salesman" | "manager") ?? "salesman";

  if (!canEditLead(lead, user.id, role)) {
    return {
      success: false,
      error: "You can only set value on leads you own. Managers can edit any lead.",
    };
  }

  const previousValue = lead.value;
  const rounded = value !== null ? Math.round(value * 100) / 100 : null;

  if (previousValue === rounded) {
    return { success: true };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({ value: rounded })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "value_set",
    from_value: previousValue?.toString() ?? null,
    to_value: rounded?.toString() ?? null,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function addLeadNote(
  leadId: string,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Note cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  const { error: insertError } = await supabase.from("lead_notes").insert({
    lead_id: leadId,
    author_id: user.id,
    content: trimmed,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function fetchLeadHistory(
  leadId: string
): Promise<import("@/lib/leads/types").LeadHistory | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { getLeadHistory } = await import("@/lib/leads/queries");
  return getLeadHistory(leadId);
}

async function getActorRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return (profile?.role as "salesman" | "manager") ?? "salesman";
}

function revalidateLeadPaths() {
  revalidatePath("/", "layout");
}

export async function closeLeadWon(
  leadId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, stage, status, owner_id")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { success: false, error: "This lead is already closed." };
  }

  const role = await getActorRole(supabase, user.id);

  if (!canEditLead(lead, user.id, role)) {
    return {
      success: false,
      error: "You can only close leads you own. Managers can close any lead.",
    };
  }

  const previousStage = lead.stage;
  const closedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      status: "closed_won",
      stage: "closed",
      closed_at: closedAt,
    })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "status_changed",
    from_value: "active",
    to_value: "closed_won",
  });

  if (previousStage !== "closed") {
    await supabase.from("lead_activity").insert({
      lead_id: leadId,
      actor_id: user.id,
      action: "stage_changed",
      from_value: previousStage,
      to_value: "closed",
    });
  }

  revalidateLeadPaths();
  return { success: true };
}

export async function closeLeadLost(
  leadId: string,
  lostReason: string
): Promise<{ success: true } | { success: false; error: string }> {
  const reason = lostReason.trim();
  if (!reason) {
    return { success: false, error: "A reason is required when marking a lead as lost." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, status, owner_id")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { success: false, error: "This lead is already closed." };
  }

  const role = await getActorRole(supabase, user.id);

  if (!canEditLead(lead, user.id, role)) {
    return {
      success: false,
      error: "You can only close leads you own. Managers can close any lead.",
    };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      status: "closed_lost",
      lost_reason: reason,
      closed_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "status_changed",
    from_value: "active",
    to_value: "closed_lost",
  });

  revalidateLeadPaths();
  return { success: true };
}

export async function claimLead(
  leadId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, owner_id, status")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { success: false, error: "Only active leads can be claimed." };
  }

  if (lead.owner_id) {
    return { success: false, error: "This lead is already claimed." };
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_lead", {
    p_lead_id: leadId,
  });

  if (claimError) {
    return {
      success: false,
      error:
        claimError.message.includes("function")
          ? "Claim is not configured — run supabase/phase7_claim.sql in Supabase."
          : claimError.message,
    };
  }

  if (!claimed) {
    return { success: false, error: "This lead could not be claimed." };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "reassigned",
    from_value: "unclaimed",
    to_value: user.id,
  });

  revalidateLeadPaths();
  return { success: true };
}

const MILESTONE_FIELDS: Record<
  MilestoneKey,
  | "inspection_scheduled_at"
  | "roof_scope_ordered_at"
  | "site_survey_complete_at"
  | "quote_presented_at"
> = {
  inspection_scheduled: "inspection_scheduled_at",
  roof_scope_ordered: "roof_scope_ordered_at",
  site_survey_complete: "site_survey_complete_at",
  quote_presented: "quote_presented_at",
};

export async function toggleMilestone(
  leadId: string,
  key: MilestoneKey,
  complete: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, status, owner_id, inspection_scheduled_at, roof_scope_ordered_at, site_survey_complete_at, quote_presented_at"
    )
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return {
      success: false,
      error: "Milestones cannot be updated on a closed lead.",
    };
  }

  const role = await getActorRole(supabase, user.id);

  if (!canEditLead(lead, user.id, role)) {
    return {
      success: false,
      error:
        "You can only update milestones on leads you own. Managers can edit any lead.",
    };
  }

  const field = MILESTONE_FIELDS[key];
  const currentlyDone = lead[field] != null;

  if (complete === currentlyDone) {
    return { success: true };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({ [field]: complete ? new Date().toISOString() : null })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "edited",
    from_value: getMilestoneLabel(key),
    to_value: complete ? "completed" : "cleared",
  });

  revalidateLeadPaths();
  return { success: true };
}