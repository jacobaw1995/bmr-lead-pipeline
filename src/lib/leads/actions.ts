"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { csvRowToProfileInput } from "@/lib/leads/csv";
import {
  buildLeadProfileRecord,
  validateLeadIdentity,
  type LeadProfileInput,
} from "@/lib/leads/profile";
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
import { normalizeImportedSource, resolveLeadSource } from "@/lib/leads/sources";
import type { CsvLeadRow } from "@/lib/leads/csv";
import type { LeadFieldPatch } from "@/lib/leads/command-center";
import type { IntakeChecklistData } from "@/lib/leads/intake-checklist";
import { shouldAutoBuildScope } from "@/lib/leads/scope";
import type { Lead, LeadStage } from "@/types/database";

export type CreateLeadInput = LeadProfileInput & {
  /** Manager CSV import — lands unclaimed in Lead Box */
  unclaimed?: boolean;
  importBatchId?: string;
};

export async function createLead(
  input: CreateLeadInput
): Promise<{ success: true; leadId: string } | { success: false; error: string }> {
  const identityError = validateLeadIdentity(input);
  if (identityError) {
    return { success: false, error: identityError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to add a lead." };
  }

  const source =
    input.source ??
    resolveLeadSource(input.sourcePicked ?? "Phone Call", input.customSource);

  if (!source) {
    return { success: false, error: "Enter a custom lead source or pick a standard one." };
  }

  const stage = input.stage ?? "lead_captured";
  const profileRecord = buildLeadProfileRecord(input, source);

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      ...profileRecord,
      stage,
      status: "active",
      owner_id: input.unclaimed ? null : user.id,
      import_batch_id: input.importBatchId ?? null,
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
    from_value: input.unclaimed ? "csv_import" : null,
    to_value: stage,
  });

  const noteText = input.notes?.trim();
  if (noteText) {
    await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      author_id: user.id,
      content: input.unclaimed
        ? `[CSV import]\n${noteText}`
        : noteText,
    });
  }

  revalidatePath("/", "layout");
  return { success: true, leadId: lead.id };
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
  if (newStage === "proposal_sent") {
    const { data: timestamps } = await supabase
      .from("leads")
      .select("proposal_sent_at, quote_presented_at")
      .eq("id", leadId)
      .single();
    if (!timestamps?.proposal_sent_at) {
      leadUpdate.proposal_sent_at = now;
    }
    if (!timestamps?.quote_presented_at) {
      leadUpdate.quote_presented_at = now;
    }
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

  type MilestoneRow = {
    roof_scope_ordered_at?: string | null;
    site_survey_complete_at?: string | null;
    quote_presented_at?: string | null;
    stage?: LeadStage;
    proposal_sent_at?: string | null;
  };

  const { data: current } = await supabase
    .from("leads")
    .select(
      key === "quote_presented"
        ? "quote_presented_at, stage, proposal_sent_at"
        : field
    )
    .eq("id", leadId)
    .single();

  const row = current as MilestoneRow | null;
  const currentlyDone = row?.[field] != null;

  if (complete === currentlyDone) {
    return { success: true };
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | null> = {
    [field]: complete ? now : null,
    last_contacted_at: now,
  };

  if (key === "quote_presented" && complete) {
    const stage = row?.stage;
    const proposalStages: LeadStage[] = [
      "proposal_sent",
      "negotiating",
      "closed",
    ];
    if (stage && !proposalStages.includes(stage)) {
      updatePayload.stage = "proposal_sent";
    }
    if (!row?.proposal_sent_at) {
      updatePayload.proposal_sent_at = now;
    }
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
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

  if (
    key === "quote_presented" &&
    complete &&
    updatePayload.stage === "proposal_sent"
  ) {
    const previousStage = row?.stage;
    if (previousStage && previousStage !== "proposal_sent") {
      await supabase.from("lead_activity").insert({
        lead_id: leadId,
        actor_id: user.id,
        action: "stage_changed",
        from_value: previousStage,
        to_value: "proposal_sent",
      });
    }
  }

  revalidateLeadPaths();
  return { success: true };
}

export type UpdateLeadDetailsInput = LeadProfileInput;

export async function updateLeadDetails(
  leadId: string,
  input: UpdateLeadDetailsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const identityError = validateLeadIdentity(input);
  if (identityError) {
    return { success: false, error: identityError };
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

  const { data: current } = await supabase
    .from("leads")
    .select("stage")
    .eq("id", leadId)
    .single();

  const source = resolveLeadSource(
    input.sourcePicked ?? "Phone Call",
    input.customSource
  );
  if (!source) {
    return {
      success: false,
      error: "Enter a custom lead source or pick a standard one.",
    };
  }

  const profileRecord = buildLeadProfileRecord(input, source);
  const updatePayload: Record<string, string | null> = {
    ...profileRecord,
    last_contacted_at: new Date().toISOString(),
  };

  if (input.stage && input.stage !== current?.stage) {
    updatePayload.stage = input.stage;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "edited",
    from_value: "Lead profile",
    to_value: "updated",
  });

  if (input.stage && current?.stage && input.stage !== current.stage) {
    await supabase.from("lead_activity").insert({
      lead_id: leadId,
      actor_id: user.id,
      action: "stage_changed",
      from_value: current.stage,
      to_value: input.stage,
    });
  }

  revalidateLeadPaths();
  return { success: true };
}

export async function fetchAssignableReps(): Promise<
  | { success: true; reps: { id: string; full_name: string }[] }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const role = await getActorRole(supabase, user.id);
  if (role !== "manager") {
    return { success: false, error: "Only managers can reassign leads." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, reps: data ?? [] };
}

export async function reassignLead(
  leadId: string,
  newOwnerId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const role = await getActorRole(supabase, user.id);
  if (role !== "manager") {
    return { success: false, error: "Only managers can reassign leads." };
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
    return { success: false, error: "Only active leads can be reassigned." };
  }

  if (lead.owner_id === newOwnerId) {
    return { success: true };
  }

  if (newOwnerId) {
    const { data: rep } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", newOwnerId)
      .single();

    if (!rep) {
      return { success: false, error: "Rep not found." };
    }
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      owner_id: newOwnerId,
      last_contacted_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "reassigned",
    from_value: lead.owner_id ?? "unclaimed",
    to_value: newOwnerId ?? "unclaimed",
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

  const typesToCancel =
    appointmentType === "site_survey" || appointmentType === "inspection"
      ? ["site_survey", "inspection"]
      : [appointmentType];

  await supabase
    .from("lead_appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("lead_id", leadId)
    .in("appointment_type", typesToCancel)
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

export async function patchLeadFields(
  leadId: string,
  patch: LeadFieldPatch
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

  const { data: current } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!current) return { success: false, error: "Lead not found." };

  const lead = current as Lead;
  const input = {
    firstName: patch.firstName ?? lead.first_name ?? "",
    lastName: patch.lastName ?? lead.last_name ?? "",
    companyName: lead.company_name ?? "",
    cellPhone: patch.cellPhone ?? lead.cell_phone ?? lead.phone ?? "",
    secondaryPhone: patch.secondaryPhone ?? lead.secondary_phone ?? "",
    email: patch.email ?? lead.email ?? "",
    billing: {
      streetAddress: lead.billing_street_address ?? "",
      city: lead.billing_city ?? "",
      state: lead.billing_state ?? "",
      zip: lead.billing_zip ?? "",
    },
    service: {
      streetAddress:
        patch.serviceStreet ??
        lead.service_street_address ??
        lead.street_address ??
        "",
      city: patch.serviceCity ?? lead.service_city ?? lead.city ?? "",
      state: patch.serviceState ?? lead.service_state ?? lead.state ?? "",
      zip: patch.serviceZip ?? lead.service_zip ?? lead.zip ?? "",
    },
    existingRoofType:
      patch.existingRoofType !== undefined
        ? patch.existingRoofType ?? ""
        : lead.existing_roof_type ?? "",
    roofTypeRequested:
      patch.roofTypeRequested !== undefined
        ? patch.roofTypeRequested ?? ""
        : lead.roof_type_requested ?? "",
    remodelOrNewConstruction:
      patch.remodelOrNewConstruction ?? lead.remodel_or_new_construction ?? "",
    homeownerOrContractor:
      patch.homeownerOrContractor ?? lead.homeowner_or_contractor ?? "",
  };

  const profileRecord = buildLeadProfileRecord(input, lead.source);
  const updatePayload: Record<string, string | null> = {
    ...profileRecord,
    last_contacted_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: user.id,
    action: "edited",
    from_value: "Vital data",
    to_value: "updated",
  });

  revalidateLeadPaths();
  return { success: true };
}

async function maybeAutoBuildScopeForLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  actorId: string
): Promise<boolean> {
  const { data: leadRow } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!leadRow) return false;

  const { data: appointments } = await supabase
    .from("lead_appointments")
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"]);

  const lead = leadRow as Lead;
  if (!shouldAutoBuildScope(lead, appointments ?? [])) return false;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("leads")
    .update({ roof_scope_ordered_at: now, last_contacted_at: now })
    .eq("id", leadId);

  if (error) return false;

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: actorId,
    action: "edited",
    from_value: "Scope",
    to_value: "auto-built from site visit data",
  });

  return true;
}

export async function updateIntakeChecklist(
  leadId: string,
  checklist: IntakeChecklistData
): Promise<
  | { success: true; scopeBuilt: boolean }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const access = await assertLeadEditable(supabase, leadId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      intake_checklist: checklist,
      last_contacted_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const scopeBuilt = await maybeAutoBuildScopeForLead(
    supabase,
    leadId,
    user.id
  );

  revalidateLeadPaths();
  return { success: true, scopeBuilt };
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
  if (
    appointment.appointment_type === "site_survey" ||
    appointment.appointment_type === "inspection"
  ) {
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

  await maybeAutoBuildScopeForLead(supabase, appointment.lead_id, user.id);

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

export interface ImportLeadsResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importLeadsFromCsv(
  rows: CsvLeadRow[],
  filename?: string
): Promise<
  | { success: true; result: ImportLeadsResult; batchId: string }
  | { success: false; error: string }
> {
  if (!rows.length) {
    return { success: false, error: "No leads to import." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "manager") {
    return { success: false, error: "Only managers can import leads." };
  }

  const { data: batch, error: batchError } = await supabase
    .from("lead_import_batches")
    .insert({
      imported_by: user.id,
      filename: filename?.trim() || null,
      row_count: rows.length,
      imported_count: 0,
      skipped_count: 0,
      status: "active",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      success: false,
      error: batchError?.message ?? "Could not create import record.",
    };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const profile = csvRowToProfileInput(row);
    const label =
      [row.firstName, row.lastName].filter(Boolean).join(" ") ||
      row.companyName ||
      `Row ${i + 2}`;

    const result = await createLead({
      ...profile,
      source: normalizeImportedSource(row.source),
      unclaimed: true,
      notes: row.notes,
      importBatchId: batch.id,
    });

    if (!result.success) {
      errors.push(`Row ${i + 2} (${label}): ${result.error}`);
      continue;
    }
    imported++;
  }

  await supabase
    .from("lead_import_batches")
    .update({
      imported_count: imported,
      skipped_count: rows.length - imported,
    })
    .eq("id", batch.id);

  revalidatePath("/", "layout");

  return {
    success: true,
    batchId: batch.id,
    result: {
      imported,
      skipped: rows.length - imported,
      errors,
    },
  };
}

export async function fetchImportBatches(): Promise<
  import("@/lib/leads/imports").ImportBatchSummary[] | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const { assertManager, getImportBatches } = await import("@/lib/leads/imports");
  const access = await assertManager(supabase, user.id);
  if (!access.ok) return { error: access.error };

  return getImportBatches();
}

export async function undoImportBatch(
  batchId: string
): Promise<
  | { success: true; deletedCount: number }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { assertManager } = await import("@/lib/leads/imports");
  const access = await assertManager(supabase, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const { data: batch } = await supabase
    .from("lead_import_batches")
    .select("id, status")
    .eq("id", batchId)
    .single();

  if (!batch) {
    return { success: false, error: "Import batch not found." };
  }

  if (batch.status === "undone") {
    return { success: false, error: "This import was already undone." };
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .eq("import_batch_id", batchId);

  const leadIds = (leads ?? []).map((l) => l.id);

  if (leadIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .in("id", leadIds);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  }

  const { error: updateError } = await supabase
    .from("lead_import_batches")
    .update({
      status: "undone",
      undone_at: new Date().toISOString(),
      undone_by: user.id,
    })
    .eq("id", batchId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidateLeadPaths();
  return { success: true, deletedCount: leadIds.length };
}

export async function wipeOrphanCsvImports(): Promise<
  | { success: true; deletedCount: number }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { assertManager, getOrphanCsvImportLeadIds } = await import(
    "@/lib/leads/imports"
  );
  const access = await assertManager(supabase, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const leadIds = await getOrphanCsvImportLeadIds();

  if (leadIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const { error: deleteError } = await supabase
    .from("leads")
    .delete()
    .in("id", leadIds);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidateLeadPaths();
  return { success: true, deletedCount: leadIds.length };
}

export async function deleteLead(
  leadId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { assertManager } = await import("@/lib/leads/imports");
  const access = await assertManager(supabase, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateLeadPaths();
  return { success: true };
}