"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatFullAddress, normalizeAddress } from "@/lib/leads/address";
import {
  APPOINTMENT_TYPE_LABELS,
  DEFAULT_APPOINTMENT_DURATION,
} from "@/lib/leads/appointments";
import {
  getMilestoneLabel,
  type MilestoneKey,
} from "@/lib/leads/milestones";
import type { AppointmentType } from "@/types/database";
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

  const now = new Date().toISOString();
  const leadUpdate: Record<string, string> = {
    stage: newStage,
    last_contacted_at: now,
  };
  if (newStage === "proposal_sent" && lead.stage !== "proposal_sent") {
    leadUpdate.proposal_sent_at = now;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(leadUpdate)
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
    .update({
      value: rounded,
      last_contacted_at: new Date().toISOString(),
    })
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

  await supabase
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", leadId);

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
  "roof_scope_ordered_at" | "site_survey_complete_at" | "quote_presented_at"
> = {
  roof_scope_ordered: "roof_scope_ordered_at",
  site_survey_complete: "site_survey_complete_at",
  quote_presented: "quote_presented_at",
};

async function assertLeadEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  userId: string
) {
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, status, owner_id")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false as const, error: "Lead not found." };
  }

  if (lead.status !== "active") {
    return { ok: false as const, error: "This lead is closed." };
  }

  const role = await getActorRole(supabase, userId);

  if (!canEditLead(lead, userId, role)) {
    return {
      ok: false as const,
      error: "You can only edit leads you own. Managers can edit any lead.",
    };
  }

  return { ok: true as const, lead };
}

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

  const access = await assertLeadEditable(supabase, leadId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const field = MILESTONE_FIELDS[key];

  const { data: current } = await supabase
    .from("leads")
    .select(field)
    .eq("id", leadId)
    .single();

  const currentlyDone =
    current?.[field as keyof typeof current] != null;

  if (complete === currentlyDone) {
    return { success: true };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      [field]: complete ? now : null,
      last_contacted_at: now,
    })
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

export async function scheduleAppointment(
  leadId: string,
  appointmentType: AppointmentType,
  scheduledAt: string,
  durationMinutes: number = DEFAULT_APPOINTMENT_DURATION
): Promise<{ success: true } | { success: false; error: string }> {
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return { success: false, error: "Invalid date and time." };
  }
  if (scheduledDate.getTime() <= Date.now()) {
    return { success: false, error: "Pick a future date and time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const access = await assertLeadEditable(supabase, leadId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const ownerId = access.lead.owner_id ?? user.id;

  const { data: conflict, error: conflictError } = await supabase.rpc(
    "has_appointment_conflict",
    {
      p_owner_id: ownerId,
      p_scheduled_at: scheduledDate.toISOString(),
      p_duration_minutes: durationMinutes,
      p_exclude_id: null,
    }
  );

  if (conflictError) {
    const hint = conflictError.message.includes("function")
      ? "Run supabase/phase9_appointments.sql in Supabase."
      : conflictError.message;
    return { success: false, error: hint };
  }

  if (conflict) {
    return {
      success: false,
      error: `You already have something scheduled during that ${durationMinutes}-minute window.`,
    };
  }

  await supabase
    .from("lead_appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("lead_id", leadId)
    .eq("appointment_type", appointmentType)
    .eq("status", "scheduled");

  const { error: insertError } = await supabase.from("lead_appointments").insert({
    lead_id: leadId,
    owner_id: ownerId,
    appointment_type: appointmentType,
    scheduled_at: scheduledDate.toISOString(),
    duration_minutes: durationMinutes,
    status: "scheduled",
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const label = APPOINTMENT_TYPE_LABELS[appointmentType];
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "edited",
    from_value: label,
    to_value: `scheduled:${scheduledDate.toISOString()}`,
  });

  await supabase
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidateLeadPaths();
  return { success: true };
}

export async function completeAppointment(
  appointmentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: appointment, error: fetchError } = await supabase
    .from("lead_appointments")
    .select("id, lead_id, appointment_type, status, scheduled_at")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    return { success: false, error: "Appointment not found." };
  }

  if (appointment.status !== "scheduled") {
    return { success: false, error: "This appointment is already finished." };
  }

  const access = await assertLeadEditable(supabase, appointment.lead_id, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("lead_appointments")
    .update({ status: "completed", completed_at: now })
    .eq("id", appointmentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const leadUpdate: Record<string, string> = { last_contacted_at: now };
  if (appointment.appointment_type === "site_survey") {
    leadUpdate.site_survey_complete_at = now;
  }

  await supabase.from("leads").update(leadUpdate).eq("id", appointment.lead_id);

  const aptType = appointment.appointment_type as AppointmentType;
  const label = APPOINTMENT_TYPE_LABELS[aptType];
  await supabase.from("lead_activity").insert({
    lead_id: appointment.lead_id,
    actor_id: user.id,
    action: "edited",
    from_value: label,
    to_value: `completed:${appointment.scheduled_at}`,
  });

  revalidateLeadPaths();
  return { success: true };
}

export async function cancelAppointment(
  appointmentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: appointment, error: fetchError } = await supabase
    .from("lead_appointments")
    .select("id, lead_id, appointment_type, status, scheduled_at")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    return { success: false, error: "Appointment not found." };
  }

  if (appointment.status !== "scheduled") {
    return { success: false, error: "Only scheduled appointments can be cancelled." };
  }

  const access = await assertLeadEditable(supabase, appointment.lead_id, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("lead_appointments")
    .update({ status: "cancelled", cancelled_at: now })
    .eq("id", appointmentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const cancelType = appointment.appointment_type as AppointmentType;
  const label = APPOINTMENT_TYPE_LABELS[cancelType];
  await supabase.from("lead_activity").insert({
    lead_id: appointment.lead_id,
    actor_id: user.id,
    action: "edited",
    from_value: label,
    to_value: `cancelled:${appointment.scheduled_at}`,
  });

  revalidateLeadPaths();
  return { success: true };
}

export async function fetchLeadAppointments(
  leadId: string
): Promise<
  import("@/types/database").LeadAppointment[] | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data, error } = await supabase
    .from("lead_appointments")
    .select("*")
    .eq("lead_id", leadId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return data ?? [];
}